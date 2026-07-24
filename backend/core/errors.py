"""Kesalahan yang perlu ditangani secara khusus oleh endpoint."""

import logging
import time
from typing import Callable, Iterator

log = logging.getLogger("retry")

# Jeda dasar (detik) tiap percobaan ulang saat kena 429. Kalau penyedia AI
# menyarankan waktu tunggu sendiri (retry_after), itu yang dipakai (dibatasi
# maksimum agar tidak melebihi batas waktu fungsi server).
_RETRY_DELAYS = (4, 8, 15, 22)
_MAX_DELAY = 30


def _delay_for(attempt: int, exc: "ModelBusy") -> int:
    base = _RETRY_DELAYS[min(attempt, len(_RETRY_DELAYS) - 1)]
    saran = getattr(exc, "retry_after", None)
    if saran:
        return min(max(int(saran) + 1, base), _MAX_DELAY)
    return base


class ModelBusy(RuntimeError):
    """Penyedia AI sedang penuh / kena batas laju (HTTP 429).

    Dibedakan dari error biasa supaya pengguna diberi saran menunggu, bukan
    pesan "proses terputus" yang membuat mereka menekan tombol berulang kali —
    yang justru memperparah antrean.
    """


# Ditampilkan apa adanya ke pengguna (hanya muncul kalau retry otomatis pun gagal).
BUSY_MESSAGE = (
    "Server AI sedang sibuk sesaat. Sistem sudah mencoba ulang otomatis — "
    "silakan tekan Buat sekali lagi dalam beberapa menit. Kuotamu tidak terpotong."
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
        except ModelBusy as exc:
            if produced or attempt >= len(_RETRY_DELAYS):
                raise
            delay = _delay_for(attempt, exc)
            log.info("Model sibuk (429). Coba lagi ke-%d dalam %ds.", attempt + 1, delay)
            time.sleep(delay)
            attempt += 1


def retry_call(fn: Callable):
    """Versi non-streaming dari `retry_stream` untuk panggilan sekali jalan."""
    attempt = 0
    while True:
        try:
            return fn()
        except ModelBusy as exc:
            if attempt >= len(_RETRY_DELAYS):
                raise
            delay = _delay_for(attempt, exc)
            log.info("Model sibuk (429). Coba lagi ke-%d dalam %ds.", attempt + 1, delay)
            time.sleep(delay)
            attempt += 1
