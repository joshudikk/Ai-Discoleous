"""Kesalahan yang perlu ditangani secara khusus oleh endpoint."""

import logging
import time
from typing import Callable, Iterator

log = logging.getLogger("retry")

# Berapa kali mencoba ulang saat kena 429, dan jeda (detik) tiap percobaan.
# 429 dari tier gratis biasanya batas per-menit yang sesaat; jeda pendek
# umumnya sudah cukup untuk lolos.
_RETRY_DELAYS = (5, 12)


class ModelBusy(RuntimeError):
    """Penyedia AI sedang penuh / kena batas laju (HTTP 429).

    Dibedakan dari error biasa supaya pengguna diberi saran menunggu, bukan
    pesan "proses terputus" yang membuat mereka menekan tombol berulang kali —
    yang justru memperparah antrean.
    """


# Ditampilkan apa adanya ke pengguna.
BUSY_MESSAGE = (
    "Server AI sedang ramai dipakai banyak orang. Untuk hasil yang maksimal, "
    "tunggu sekitar 30 menit lalu jalankan lagi. Kuotamu tidak terpotong."
)


def retry_stream(make_stream: Callable[[], Iterator[str]]) -> Iterator[str]:
    """Jalankan generator teks; kalau `ModelBusy` (429) muncul SEBELUM ada teks
    keluar, tunggu sebentar lalu ulangi dari awal.

    Begitu teks pertama sudah mengalir, tidak diulang lagi (tidak mungkin
    menarik kembali yang sudah dikirim). Error lain diteruskan apa adanya.
    """
    attempt = 0
    while True:
        produced = False
        try:
            for piece in make_stream():
                produced = True
                yield piece
            return
        except ModelBusy:
            if produced or attempt >= len(_RETRY_DELAYS):
                raise
            delay = _RETRY_DELAYS[attempt]
            log.info("Model sibuk (429). Coba lagi ke-%d dalam %ds.", attempt + 1, delay)
            time.sleep(delay)
            attempt += 1


def retry_call(fn: Callable):
    """Versi non-streaming dari `retry_stream` untuk panggilan sekali jalan."""
    attempt = 0
    while True:
        try:
            return fn()
        except ModelBusy:
            if attempt >= len(_RETRY_DELAYS):
                raise
            delay = _RETRY_DELAYS[attempt]
            log.info("Model sibuk (429). Coba lagi ke-%d dalam %ds.", attempt + 1, delay)
            time.sleep(delay)
            attempt += 1
