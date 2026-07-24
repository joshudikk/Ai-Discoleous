"""Kredit pemakaian mesin premium Claude.

Aturan per paket (lihat Tier.claude_*):
  - Sharnikas : 1 kali seumur akun (claude_period="never")
  - Dikthought: 3 kali per bulan   (claude_period="month")
Setelah jatah gratis habis, pengguna bisa membeli kredit tambahan
(Rp15.000/pemakaian) yang diberikan admin lewat endpoint grant.

Data disimpan di koleksi `claude/{uid}` = { periodKey, used, extraCredits } dan
hanya disentuh backend (Admin SDK). Pemesanan slot dilakukan dalam transaksi
Firestore supaya tidak bisa ditembus oleh dua permintaan bersamaan.
"""

from datetime import datetime, timezone

from firebase_admin import firestore

from core.firebase import db
from core.tiers import Tier

CLAUDE = "claude"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _period_key(tier: Tier, now: datetime) -> str:
    """Kunci periode jatah gratis: per-bulan atau seumur akun."""
    if tier.claude_period == "month":
        return now.strftime("%Y-%m")
    return "LIFETIME"


def _reset_at_iso(tier: Tier, now: datetime) -> str | None:
    """Kapan jatah gratis diperbarui. Untuk 'never' tidak ada (None)."""
    if tier.claude_period != "month":
        return None
    year, month = now.year, now.month
    nxt = datetime(year + (month // 12), (month % 12) + 1, 1, tzinfo=timezone.utc)
    return nxt.isoformat()


def check_and_reserve(uid: str, tier: Tier) -> dict:
    """Pesan satu pemakaian Claude secara atomik.

    Mengembalikan: allowed, source ("free"|"extra"|None), freeRemaining,
    extraCredits, resetAt.
    """
    ref = db.collection(CLAUDE).document(uid)

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

        free_remaining = max(0, tier.claude_free - used)
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
    """Kembalikan slot kalau generate Claude gagal total (best-effort)."""
    ref = db.collection(CLAUDE).document(uid)
    try:
        if source == "free":
            ref.update({"used": firestore.Increment(-1)})
        elif source == "extra":
            ref.update({"extraCredits": firestore.Increment(1)})
    except Exception:
        pass


def grant_extra(uid: str, count: int) -> dict:
    """Admin menambah kredit Claude berbayar (Rp15.000/pemakaian)."""
    ref = db.collection(CLAUDE).document(uid)
    ref.set({"extraCredits": firestore.Increment(count)}, merge=True)
    data = ref.get().to_dict() or {}
    return {"uid": uid, "extraCredits": data.get("extraCredits", 0)}


def get_status(uid: str, tier: Tier) -> dict:
    """Status kredit Claude untuk ditampilkan ke pengguna."""
    if not tier.claude_enabled:
        return {"enabled": False, "free": 0, "freeRemaining": 0, "extraCredits": 0, "remaining": 0, "period": tier.claude_period, "resetAt": None}

    snap = db.collection(CLAUDE).document(uid).get()
    data = snap.to_dict() if snap.exists else {}
    now = _now()
    period = _period_key(tier, now)

    used = data.get("used", 0)
    if data.get("periodKey") != period:
        used = 0
    extra = data.get("extraCredits", 0)
    free_remaining = max(0, tier.claude_free - used)

    return {
        "enabled": True,
        "free": tier.claude_free,
        "freeRemaining": free_remaining,
        "extraCredits": extra,
        "remaining": free_remaining + extra,
        "period": tier.claude_period,
        "resetAt": _reset_at_iso(tier, now),
    }
