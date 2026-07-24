"""Kuota pembuatan dokumen per pengguna.

Setiap paket punya batas jumlah output per satu jendela waktu (lihat
`Tier.daily_limit` dan `Tier.window_hours`). Jendela bersifat tetap dan dimulai
dari pemakaian pertama; saat jendela habis, kuota diperbarui otomatis.

Data disimpan di koleksi `usage/{uid}` = { windowStart, count } dan hanya
disentuh backend (Admin SDK). Penghitungan dilakukan dalam transaksi Firestore
supaya dua permintaan bersamaan tidak bisa menembus batas.
"""

from datetime import datetime, timedelta, timezone

from firebase_admin import firestore

from core.firebase import db
from core.tiers import Tier

USAGE = "usage"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def check_and_reserve(uid: str, tier: Tier) -> dict:
    """Cek kuota dan—kalau masih ada—pesan satu slot secara atomik.

    Mengembalikan dict: allowed, remaining, limit, resetAt (datetime|None).
    """
    ref = db.collection(USAGE).document(uid)
    window = timedelta(hours=tier.window_hours)

    @firestore.transactional
    def _run(transaction) -> dict:
        snap = ref.get(transaction=transaction)
        data = snap.to_dict() if snap.exists else {}
        window_start = data.get("windowStart")
        count = data.get("count", 0)
        now = _now()

        # Jendela baru kalau belum pernah dipakai atau sudah kedaluwarsa.
        if window_start is None or (now - window_start) >= window:
            window_start = now
            count = 0

        reset_at = window_start + window
        if count >= tier.daily_limit:
            return {"allowed": False, "remaining": 0, "limit": tier.daily_limit, "resetAt": reset_at}

        transaction.set(ref, {"windowStart": window_start, "count": count + 1})
        return {
            "allowed": True,
            "remaining": tier.daily_limit - (count + 1),
            "limit": tier.daily_limit,
            "resetAt": reset_at,
        }

    return _run(db.transaction())


def refund(uid: str) -> None:
    """Kembalikan satu slot kalau pembuatan dokumen gagal total (best-effort)."""
    ref = db.collection(USAGE).document(uid)
    try:
        snap = ref.get()
        if snap.exists:
            count = snap.to_dict().get("count", 0)
            if count > 0:
                ref.update({"count": count - 1})
    except Exception:
        pass


def get_status(uid: str, tier: Tier) -> dict:
    """Status kuota untuk ditampilkan ke pengguna (tanpa memesan slot)."""
    ref = db.collection(USAGE).document(uid)
    window = timedelta(hours=tier.window_hours)
    snap = ref.get()
    data = snap.to_dict() if snap.exists else {}
    window_start = data.get("windowStart")
    count = data.get("count", 0)
    now = _now()

    if window_start is None or (now - window_start) >= window:
        used = 0
        reset_at = None  # jendela belum berjalan sampai ada pemakaian pertama
    else:
        used = min(count, tier.daily_limit)
        reset_at = window_start + window

    return {
        "limit": tier.daily_limit,
        "windowHours": tier.window_hours,
        "used": used,
        "remaining": max(0, tier.daily_limit - used),
        "resetAt": reset_at.isoformat() if reset_at else None,
    }
