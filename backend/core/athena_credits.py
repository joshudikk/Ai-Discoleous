"""Kredit pemakaian mesin premium "Athena Mode".

Aturan per paket (lihat Tier.athena_*):
  - Sharnikas : 1 kali seumur akun (athena_period="never")
  - Dikthought: 3 kali per bulan   (athena_period="month")
Setelah jatah gratis habis, pengguna bisa membeli kredit tambahan
(Rp15.000/pemakaian) yang diberikan admin lewat endpoint grant.

Data disimpan di koleksi `athena/{uid}` = { periodKey, used, extraCredits } dan
hanya disentuh backend (Admin SDK). Pemesanan slot dilakukan dalam transaksi
Firestore supaya tidak bisa ditembus oleh dua permintaan bersamaan.
"""

from datetime import datetime, timezone

from firebase_admin import firestore

from core.firebase import db
from core.tiers import Tier

ATHENA = "athena"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _period_key(tier: Tier, now: datetime) -> str:
    """Kunci periode jatah gratis: per-bulan atau seumur akun."""
    if tier.athena_period == "month":
        return now.strftime("%Y-%m")
    return "LIFETIME"


def _reset_at_iso(tier: Tier, now: datetime) -> str | None:
    """Kapan jatah gratis diperbarui. Untuk 'never' tidak ada (None)."""
    if tier.athena_period != "month":
        return None
    year, month = now.year, now.month
    nxt = datetime(year + (month // 12), (month % 12) + 1, 1, tzinfo=timezone.utc)
    return nxt.isoformat()


def check_and_reserve(uid: str, tier: Tier) -> dict:
    """Pesan satu pemakaian Athena secara atomik.

    Mengembalikan dict: allowed, source ("free"|"extra"|None), freeRemaining,
    extraCredits, resetAt.
    """
    ref = db.collection(ATHENA).document(uid)

    @firestore.transactional
    def _run(transaction) -> dict:
        snap = ref.get(transaction=transaction)
        data = snap.to_dict() if snap.exists else {}
        now = _now()
        period = _period_key(tier, now)

        used = data.get("used", 0)
        if data.get("periodKey") != period:
            used = 0  # periode baru → jatah gratis kembali penuh
        extra = data.get("extraCredits", 0)

        free_remaining = max(0, tier.athena_free - used)
        reset_at = _reset_at_iso(tier, now)

        if free_remaining > 0:
            transaction.set(ref, {"periodKey": period, "used": used + 1, "extraCredits": extra})
            return {
                "allowed": True, "source": "free",
                "freeRemaining": free_remaining - 1, "extraCredits": extra, "resetAt": reset_at,
            }
        if extra > 0:
            transaction.set(ref, {"periodKey": period, "used": used, "extraCredits": extra - 1})
            return {
                "allowed": True, "source": "extra",
                "freeRemaining": 0, "extraCredits": extra - 1, "resetAt": reset_at,
            }
        return {"allowed": False, "source": None, "freeRemaining": 0, "extraCredits": 0, "resetAt": reset_at}

    return _run(db.transaction())


def refund(uid: str, source: str) -> None:
    """Kembalikan slot kalau pembuatan dokumen gagal total (best-effort)."""
    ref = db.collection(ATHENA).document(uid)
    try:
        if source == "free":
            ref.update({"used": firestore.Increment(-1)})
        elif source == "extra":
            ref.update({"extraCredits": firestore.Increment(1)})
    except Exception:
        pass


def grant_extra(uid: str, count: int) -> dict:
    """Admin menambah kredit Athena berbayar (Rp15.000/pemakaian)."""
    ref = db.collection(ATHENA).document(uid)
    ref.set({"extraCredits": firestore.Increment(count)}, merge=True)
    data = ref.get().to_dict() or {}
    return {"uid": uid, "extraCredits": data.get("extraCredits", 0)}


def get_status(uid: str, tier: Tier) -> dict:
    """Status kredit Athena untuk ditampilkan ke pengguna."""
    if not tier.athena_enabled:
        return {
            "enabled": False, "free": 0, "freeRemaining": 0, "extraCredits": 0,
            "remaining": 0, "period": tier.athena_period, "resetAt": None,
        }

    snap = db.collection(ATHENA).document(uid).get()
    data = snap.to_dict() if snap.exists else {}
    now = _now()
    period = _period_key(tier, now)

    used = data.get("used", 0)
    if data.get("periodKey") != period:
        used = 0
    extra = data.get("extraCredits", 0)
    free_remaining = max(0, tier.athena_free - used)

    return {
        "enabled": True,
        "free": tier.athena_free,
        "freeRemaining": free_remaining,
        "extraCredits": extra,
        "remaining": free_remaining + extra,
        "period": tier.athena_period,
        "resetAt": _reset_at_iso(tier, now),
    }
