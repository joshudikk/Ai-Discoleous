"""Mesin premium "Athena Mode" lewat OpenRouter.

OpenRouter memakai format API yang sama dengan OpenAI, jadi dipakai SDK resmi
`openai` dengan `base_url` diarahkan ke OpenRouter. Konsekuensinya, pindah ke
penyedia lain (DeepSeek, Groq, dsb.) nanti cukup mengganti `base_url` + kunci —
kode di bawah tidak perlu diubah.

Prompt dan instruksi sistemnya sama persis dengan Thunder Mode (Gemini), jadi
struktur dokumen tetap konsisten; hanya modelnya yang berbeda.
"""

import logging
import re
from typing import Iterator

from openai import APIStatusError, OpenAI

from core.config import get_settings
from core.errors import BUSY_MESSAGE, ModelBusy, retry_stream
from core.tiers import Tier, build_prompt, build_system_instruction

log = logging.getLogger("athena")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

_settings = get_settings()
_client = (
    OpenAI(base_url=OPENROUTER_BASE_URL, api_key=_settings.openrouter_api_key)
    if _settings.openrouter_api_key
    else None
)

# Batas atas token keluaran; panjang sebenarnya dikendalikan oleh prompt.
_MAX_TOKENS = 20_000

_THINK_OPEN, _THINK_CLOSE = "<think>", "</think>"


class AthenaUnavailable(RuntimeError):
    """Athena Mode tidak bisa dipakai (kunci ditolak, kuota habis, model salah).

    Dibedakan dari error biasa supaya pengguna mendapat pesan yang benar.
    """


def athena_available() -> bool:
    return _client is not None


def athena_model_for(tier: Tier) -> str:
    """Model efektif: setelan ATHENA_MODEL di .env menang atas bawaan paket."""
    return _settings.athena_model or tier.athena_model


def _strip_thinking(potongan: Iterator[str]) -> Iterator[str]:
    """Buang blok <think>…</think> yang kadang bocor dari model penalaran.

    Bekerja lintas potongan stream: sisa teks yang mungkin memuat separuh tag
    ditahan dulu sampai potongan berikutnya datang.
    """
    sisa = ""
    di_dalam = False
    ekor = max(len(_THINK_OPEN), len(_THINK_CLOSE))

    for bagian in potongan:
        sisa += bagian
        keluar = ""
        while sisa:
            if di_dalam:
                idx = sisa.find(_THINK_CLOSE)
                if idx == -1:
                    sisa = sisa[-ekor:] if len(sisa) > ekor else sisa
                    break
                sisa = sisa[idx + len(_THINK_CLOSE) :]
                di_dalam = False
            else:
                idx = sisa.find(_THINK_OPEN)
                if idx == -1:
                    if len(sisa) > ekor:
                        keluar += sisa[:-ekor]
                        sisa = sisa[-ekor:]
                    break
                keluar += sisa[:idx]
                sisa = sisa[idx + len(_THINK_OPEN) :]
                di_dalam = True
        if keluar:
            yield keluar

    if not di_dalam and sisa:
        yield sisa


def generate_document_stream_athena(
    tier: Tier,
    doc_type: str,
    title: str,
    jurusan: str,
    catatan: str,
    panjang: str,
    metode: str = "tidak",
    pustaka: str = "bebas",
) -> Iterator[str]:
    """Alirkan isi dokumen dari model premium, potong demi potong."""
    if _client is None:
        raise AthenaUnavailable("Athena Mode belum diaktifkan admin. Coba lagi nanti.")

    model = athena_model_for(tier)
    system = build_system_instruction(tier, doc_type)
    prompt = build_prompt(doc_type, title, jurusan, catatan, panjang, metode, pustaka)

    def mentah() -> Iterator[str]:
        try:
            stream = _client.chat.completions.create(
                model=model,
                max_tokens=_MAX_TOKENS,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                stream=True,
                # Dipakai OpenRouter untuk atribusi aplikasi (opsional).
                extra_headers={"X-Title": "Discoleous"},
            )
            for chunk in stream:
                if not chunk.choices:
                    continue
                teks = chunk.choices[0].delta.content
                if teks:
                    yield teks
        except APIStatusError as exc:
            pesan = str(exc).lower()
            if exc.status_code in (401, 403):
                log.error("Kunci OpenRouter ditolak: %s", exc)
                raise AthenaUnavailable(
                    "Athena Mode sedang bermasalah (kunci API ditolak). "
                    "Kesempatanmu tidak terpotong — hubungi admin lewat WhatsApp."
                ) from exc
            if exc.status_code == 429 or "rate limit" in pesan or "quota" in pesan:
                log.warning("Batas laju OpenRouter tercapai: %s", exc)
                raise ModelBusy(BUSY_MESSAGE) from exc
            if exc.status_code == 404:
                log.error("Model Athena tidak ditemukan: %s", model)
                raise AthenaUnavailable(
                    "Model Athena Mode tidak tersedia. Kesempatanmu tidak terpotong — hubungi admin."
                ) from exc
            raise

    # Kena 429 sesaat → otomatis dicoba ulang (retry_stream hanya menangkap
    # ModelBusy; AthenaUnavailable untuk kunci/model salah tetap diteruskan).
    yield from retry_stream(lambda: _strip_thinking(mentah()))
