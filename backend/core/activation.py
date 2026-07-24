"""Token aktivasi langganan.

Alur: pengguna klik "sudah bayar" (status `pending`) -> admin verifikasi
(sistem membuat token, status `verified`) -> pengguna memasukkan token yang
diberi admin lewat WhatsApp (status `active`).

Token TIDAK boleh bisa dibaca pengguna dari sisi klien. Karena itu ia disimpan
di koleksi terpisah `activations/{uid}` yang dikunci total oleh aturan Firestore
dan hanya disentuh backend lewat Admin SDK. Profil `users/{uid}` cukup memuat
`statusSubscription` saja (bukan rahasia).
"""

import secrets

# Koleksi khusus backend. Aturan Firestore menolak semua akses klien ke sini.
ACTIVATIONS = "activations"

# Status langganan yang dipakai di seluruh aplikasi.
STATUS_INACTIVE = "inactive"   # baru daftar, belum bayar
STATUS_PENDING = "pending"     # sudah klik "saya sudah bayar", menunggu admin
STATUS_VERIFIED = "verified"   # admin sudah verifikasi, token terbit, menunggu pengguna
STATUS_ACTIVE = "active"       # token cocok, langganan hidup

# Hindari karakter yang mudah tertukar (0/O, 1/I) supaya enak didikte lewat WA.
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_token(length: int = 8) -> str:
    """Kode acak kuat, mis. 'K7XM2QP9'."""
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))


def normalize_token(raw: str) -> str:
    """Samakan bentuk sebelum dibandingkan: huruf besar, tanpa spasi/strip."""
    return (raw or "").upper().replace(" ", "").replace("-", "").strip()
