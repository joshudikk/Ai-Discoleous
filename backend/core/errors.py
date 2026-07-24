"""Kesalahan yang perlu ditangani secara khusus oleh endpoint."""


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
