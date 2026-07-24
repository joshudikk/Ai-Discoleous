"""Pembungkus SDK resmi Anthropic (Claude) untuk mesin premium.

Dipakai paket Sharnikas & Dikthought sebagai alternatif Gemini. Memakai prompt
dan instruksi sistem yang sama dengan alur Gemini, jadi struktur dokumennya
konsisten — hanya modelnya yang berbeda.
"""

import logging
from typing import Iterator

import anthropic

from core.config import get_settings
from core.tiers import Tier, build_prompt, build_system_instruction

log = logging.getLogger("claude")

_settings = get_settings()
# Klien hanya dibuat kalau kunci tersedia. Kalau tidak, fitur Claude nonaktif.
_client = anthropic.Anthropic(api_key=_settings.anthropic_api_key) if _settings.anthropic_api_key else None

# Streaming: batas atas token keluaran. Cukup besar untuk dokumen panjang;
# panjang sebenarnya dikendalikan oleh prompt (ringkas/standar/lengkap).
_MAX_TOKENS = 20_000


def claude_available() -> bool:
    return _client is not None


def generate_document_stream_claude(
    tier: Tier,
    doc_type: str,
    title: str,
    jurusan: str,
    catatan: str,
    panjang: str,
    metode: str = "tidak",
    pustaka: str = "bebas",
) -> Iterator[str]:
    """Alirkan isi dokumen dari Claude, potong demi potong (hanya teks)."""
    if _client is None:
        raise RuntimeError("ANTHROPIC_API_KEY belum dikonfigurasi")

    system = build_system_instruction(tier, doc_type)
    prompt = build_prompt(doc_type, title, jurusan, catatan, panjang, metode, pustaka)

    # Opus 4.8: tanpa parameter sampling (ditolak), thinking dibiarkan mati
    # (omit) supaya seluruh anggaran token dipakai untuk dokumen.
    with _client.messages.stream(
        model=tier.claude_model,
        max_tokens=_MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            if text:
                yield text
