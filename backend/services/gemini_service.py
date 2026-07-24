"""Pembungkus SDK resmi Google Gemini (`google-genai`).

Dua kemampuan yang dipakai aplikasi:
  1. generate_document_stream  -> menghasilkan dokumen sambil dialirkan potong demi potong
  2. suggest_titles            -> keluaran JSON terstruktur berisi daftar judul
"""

import json
import logging
from typing import Iterator

from google import genai
from google.genai import types

from core.config import get_settings
from core.errors import BUSY_MESSAGE, ModelBusy, retry_call, retry_stream
from core.tiers import (
    Tier,
    build_prompt,
    build_system_instruction,
    build_title_prompt,
)

log = logging.getLogger("gemini")
client = genai.Client(api_key=get_settings().gemini_api_key)


def _terjemahkan(exc: Exception) -> Exception:
    """Ubah 429/kuota habis dari Gemini jadi ModelBusy agar pesannya jelas."""
    teks = str(exc)
    kode = getattr(exc, "code", None)
    if kode == 429 or "429" in teks or "RESOURCE_EXHAUSTED" in teks:
        log.warning("Batas laju Gemini tercapai: %s", teks[:200])
        return ModelBusy(BUSY_MESSAGE)
    return exc


def generate_document_stream(
    tier: Tier,
    doc_type: str,
    title: str,
    jurusan: str,
    catatan: str,
    panjang: str,
    metode: str = "tidak",
    pustaka: str = "bebas",
) -> Iterator[str]:
    """Alirkan isi dokumen. Model dan gaya penulisan mengikuti paket pengguna.

    Kalau kena batas laju sesaat (429), otomatis dicoba ulang sebelum menyerah.
    """
    config = types.GenerateContentConfig(
        system_instruction=build_system_instruction(tier, doc_type),
        temperature=tier.temperature,
        max_output_tokens=tier.max_output_tokens,
        top_p=0.95,
    )

    def _once():
        try:
            stream = client.models.generate_content_stream(
                model=tier.model,
                contents=build_prompt(doc_type, title, jurusan, catatan, panjang, metode, pustaka),
                config=config,
            )
            for chunk in stream:
                text = getattr(chunk, "text", None)
                if text:
                    yield text
        except Exception as exc:
            raise _terjemahkan(exc) from exc

    yield from retry_stream(_once)


def suggest_titles(tier: Tier, jurusan: str, doc_type: str, keyword: str) -> list[str]:
    """Minta daftar judul dalam format JSON supaya langsung bisa dipetakan ke UI."""
    config = types.GenerateContentConfig(
        temperature=1.0,
        response_mime_type="application/json",
        response_schema={
            "type": "ARRAY",
            "items": {"type": "STRING"},
        },
        system_instruction=(
            "Kamu membantu mahasiswa Indonesia menemukan judul tugas akhir dan makalah. "
            "Jawab hanya dengan array JSON berisi string judul, tanpa penjelasan apa pun."
        ),
    )

    def _call():
        try:
            return client.models.generate_content(
                model=tier.model,
                contents=build_title_prompt(jurusan, doc_type, keyword),
                config=config,
            )
        except Exception as exc:
            raise _terjemahkan(exc) from exc

    response = retry_call(_call)

    raw = (response.text or "").strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        log.warning("Balasan judul bukan JSON valid: %s", raw[:200])
        # Cadangan: ambil baris demi baris kalau model terlanjur menulis daftar biasa
        data = [line.lstrip("-*0123456789. ").strip() for line in raw.splitlines() if line.strip()]

    titles = [str(t).strip().strip('"') for t in data if str(t).strip()]
    return titles[:8]
