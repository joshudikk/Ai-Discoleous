"""Kode promo/diskon.

Admin membuat kode + persen diskon. Pelanggan memasukkan kode saat akan bayar;
harganya otomatis terpotong. Disimpan di koleksi `promos/{CODE}` dan dikunci
dari klien (hanya backend/Admin SDK). Pelanggan memvalidasi kode lewat endpoint,
jadi tidak bisa menebak/melihat daftar kode.
"""

from firebase_admin import firestore

from core.firebase import db

PROMOS = "promos"


def normalize_code(code: str) -> str:
    return (code or "").strip().upper()


def create_promo(code: str, discount_percent: int) -> dict:
    code = normalize_code(code)
    db.collection(PROMOS).document(code).set(
        {
            "code": code,
            "discountPercent": int(discount_percent),
            "active": True,
            "createdAt": firestore.SERVER_TIMESTAMP,
        }
    )
    return {"code": code, "discountPercent": int(discount_percent), "active": True}


def get_promo(code: str) -> dict | None:
    """Kembalikan {code, discountPercent} kalau kode ada & aktif, jika tidak None."""
    code = normalize_code(code)
    if not code:
        return None
    snap = db.collection(PROMOS).document(code).get()
    if not snap.exists:
        return None
    data = snap.to_dict()
    if not data.get("active", True):
        return None
    disc = int(data.get("discountPercent", 0))
    if disc <= 0:
        return None
    return {"code": code, "discountPercent": disc}


def list_promos() -> list[dict]:
    rows = []
    for doc in db.collection(PROMOS).stream():
        d = doc.to_dict()
        created = d.get("createdAt")
        rows.append(
            {
                "code": doc.id,
                "discountPercent": int(d.get("discountPercent", 0)),
                "active": d.get("active", True),
                "createdAt": created.isoformat() if hasattr(created, "isoformat") else None,
            }
        )
    rows.sort(key=lambda r: r["code"])
    return rows


def delete_promo(code: str) -> None:
    db.collection(PROMOS).document(normalize_code(code)).delete()


def price_after(base_price: int, discount_percent: int) -> int:
    """Harga setelah diskon, dibulatkan ke rupiah terdekat."""
    disc = max(0, min(100, int(discount_percent or 0)))
    return round(base_price * (100 - disc) / 100)
