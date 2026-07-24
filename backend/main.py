"""API pembuat dokumen akademik.

Menjalankan: uvicorn main:app --reload --port 8000

Alur setiap permintaan:
  Firebase ID token -> verifikasi -> baca profil di Firestore -> tentukan paket
  -> pilih model Gemini dan gaya prompt -> jalankan.

Pemeriksaan paket dilakukan di sini, bukan hanya di frontend. Tombol yang
disembunyikan di UI tetap bisa dipanggil langsung lewat HTTP, jadi aturan
sebenarnya harus hidup di server.
"""

import json
import logging

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from firebase_admin import firestore

from core.activation import (
    ACTIVATIONS,
    STATUS_ACTIVE,
    STATUS_PENDING,
    STATUS_VERIFIED,
    generate_token,
    normalize_token,
)
from core.claude_credits import (
    check_and_reserve as claude_reserve,
    get_status as claude_status,
    grant_extra as claude_grant,
)
from core.claude_credits import refund as claude_refund
from core.config import get_settings
from core.firebase import CurrentUser, db, get_current_user, require_admin
from core.schemas import (
    ClaimPaymentRequest,
    ClaudeGrantRequest,
    GenerateRequest,
    MeResponse,
    PaymentStatusResponse,
    RedeemTokenRequest,
    SuggestTitlesRequest,
    SuggestTitlesResponse,
)
from core.tiers import get_tier
from core.usage import check_and_reserve, get_status, refund
from services.claude_service import claude_available, generate_document_stream_claude
from services.gemini_service import generate_document_stream, suggest_titles

MAX_TOKEN_ATTEMPTS = 8


def _iso(value):
    return value.isoformat() if hasattr(value, "isoformat") else None

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("api")
settings = get_settings()

app = FastAPI(title="Discoleous API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def _sse(payload: dict) -> str:
    """Bungkus satu pesan Server-Sent Events."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _require_active(user: CurrentUser) -> None:
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "SUBSCRIPTION_INACTIVE",
                "message": "Langganan belum aktif. Selesaikan pembayaran lalu minta admin mengaktifkan akun.",
            },
        )


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/me", response_model=MeResponse)
async def me(user: CurrentUser = Depends(get_current_user)):
    tier = get_tier(user.tier)
    return MeResponse(
        uid=user.uid,
        nama=user.nama,
        tier=tier.id,
        role=user.role,
        statusSubscription=user.status,
        canSuggestTitles=tier.can_suggest_titles,
        model=tier.model,
    )


@app.get("/api/usage")
async def api_usage(user: CurrentUser = Depends(get_current_user)):
    """Sisa kuota pembuatan dokumen + waktu pembaruannya."""
    return get_status(user.uid, get_tier(user.tier))


@app.get("/api/claude-usage")
async def api_claude_usage(user: CurrentUser = Depends(get_current_user)):
    """Sisa kesempatan mesin premium Claude untuk pemanggil."""
    data = claude_status(user.uid, get_tier(user.tier))
    data["configured"] = claude_available()
    return data


# ── Pembayaran & aktivasi token ───────────────────────────────────────────────


@app.post("/api/payment/claim", response_model=PaymentStatusResponse)
async def payment_claim(
    body: ClaimPaymentRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Pengguna menandai sudah membayar. Status pindah ke `pending`, menunggu admin.

    Boleh sekaligus memilih paket (mis. saat naik paket). Penetapan paket terjadi
    di sini, bukan di klien — aturan Firestore melarang klien mengubah paketnya
    sendiri.
    """
    tier = get_tier(body.packageTier)

    db.collection("users").document(user.uid).update(
        {"packageTier": tier.id, "statusSubscription": STATUS_PENDING}
    )
    db.collection(ACTIVATIONS).document(user.uid).set(
        {
            "uid": user.uid,
            "nama": user.nama,
            "email": user.email,
            "packageTier": tier.id,
            "status": STATUS_PENDING,
            "token": None,
            "attempts": 0,
            "claimedAt": firestore.SERVER_TIMESTAMP,
            "verifiedAt": None,
            "activatedAt": None,
        }
    )
    return PaymentStatusResponse(status=STATUS_PENDING, tier=tier.id)


@app.post("/api/payment/redeem", response_model=PaymentStatusResponse)
async def payment_redeem(
    body: RedeemTokenRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Pengguna memasukkan token dari admin. Kalau cocok, langganan jadi `active`."""
    ref = db.collection(ACTIVATIONS).document(user.uid)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "NO_CLAIM", "message": 'Belum ada pengajuan. Tekan "Saya sudah bayar" dulu.'},
        )

    data = snap.to_dict()
    if data.get("status") == STATUS_ACTIVE:
        return PaymentStatusResponse(status=STATUS_ACTIVE, tier=data.get("packageTier", user.tier))

    if data.get("status") != STATUS_VERIFIED or not data.get("token"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "NOT_VERIFIED",
                "message": "Pembayaran belum diverifikasi admin. Hubungi admin lewat WhatsApp untuk konfirmasi.",
            },
        )

    if data.get("attempts", 0) >= MAX_TOKEN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"code": "TOO_MANY", "message": "Terlalu banyak percobaan token. Hubungi admin untuk token baru."},
        )

    if normalize_token(body.token) != normalize_token(data["token"]):
        ref.update({"attempts": firestore.Increment(1)})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "BAD_TOKEN", "message": "Kode token salah. Pastikan sama persis dengan yang diberi admin."},
        )

    tier_id = data.get("packageTier", user.tier)
    db.collection("users").document(user.uid).update({"statusSubscription": STATUS_ACTIVE})
    ref.update({"status": STATUS_ACTIVE, "token": None, "activatedAt": firestore.SERVER_TIMESTAMP})
    return PaymentStatusResponse(status=STATUS_ACTIVE, tier=tier_id)


@app.get("/api/admin/payments")
async def api_admin_payments(_: CurrentUser = Depends(require_admin)):
    """Daftar pengajuan yang menunggu verifikasi atau sudah terbit token."""
    rows = []
    for d in db.collection(ACTIVATIONS).stream():
        x = d.to_dict()
        if x.get("status") not in (STATUS_PENDING, STATUS_VERIFIED):
            continue
        rows.append(
            {
                "uid": x.get("uid", d.id),
                "nama": x.get("nama", ""),
                "email": x.get("email", ""),
                "packageTier": x.get("packageTier", "faozonica"),
                "status": x.get("status", STATUS_PENDING),
                # Token hanya diberikan ke admin setelah diverifikasi.
                "token": x.get("token") if x.get("status") == STATUS_VERIFIED else None,
                "claimedAt": _iso(x.get("claimedAt")),
                "verifiedAt": _iso(x.get("verifiedAt")),
            }
        )
    rows.sort(key=lambda r: r["claimedAt"] or "", reverse=True)
    return rows


@app.post("/api/admin/payments/{uid}/verify")
async def api_admin_verify_payment(uid: str, _: CurrentUser = Depends(require_admin)):
    """Admin memverifikasi pembayaran. Sistem membuat token dan menampilkannya
    ke admin untuk diteruskan ke pengguna lewat WhatsApp.

    Bisa dipanggil dari daftar pembayaran (pengguna sudah menekan "Saya sudah
    bayar") maupun langsung dari tabel pengguna. Kalau catatan aktivasi belum
    ada, dibuatkan dari profil pengguna—jadi admin bisa memverifikasi siapa pun.
    """
    user_snap = db.collection("users").document(uid).get()
    if not user_snap.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NO_USER", "message": "Pengguna tidak ditemukan."},
        )
    profile = user_snap.to_dict()

    ref = db.collection(ACTIVATIONS).document(uid)
    data = ref.get().to_dict() or {}

    if data.get("status") == STATUS_ACTIVE or profile.get("statusSubscription") == STATUS_ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ALREADY_ACTIVE", "message": "Langganan pengguna ini sudah aktif."},
        )

    # Idempoten: kalau sudah diverifikasi, kembalikan token yang sama.
    if data.get("status") == STATUS_VERIFIED and data.get("token"):
        return {"uid": uid, "token": data["token"], "status": STATUS_VERIFIED}

    token = generate_token()
    ref.set(
        {
            "uid": uid,
            "nama": profile.get("nama", ""),
            "email": profile.get("email", ""),
            "packageTier": data.get("packageTier") or profile.get("packageTier", "faozonica"),
            "status": STATUS_VERIFIED,
            "token": token,
            "attempts": 0,
            "claimedAt": data.get("claimedAt") or firestore.SERVER_TIMESTAMP,
            "verifiedAt": firestore.SERVER_TIMESTAMP,
            "activatedAt": None,
        },
        merge=True,
    )
    db.collection("users").document(uid).update({"statusSubscription": STATUS_VERIFIED})
    return {"uid": uid, "token": token, "status": STATUS_VERIFIED}


@app.post("/api/suggest-titles", response_model=SuggestTitlesResponse)
async def api_suggest_titles(
    body: SuggestTitlesRequest,
    user: CurrentUser = Depends(get_current_user),
):
    tier = get_tier(user.tier)

    # Gerbang paket: hanya Sharnikas dan Dikthought
    if not tier.can_suggest_titles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "TIER_LOCKED",
                "message": (
                    "Fitur Saran Judul hanya tersedia untuk paket Medium (Sharnikas) "
                    "atau Tinggi (Dikthought). Silakan Upgrade Paket Anda!"
                ),
            },
        )

    _require_active(user)

    try:
        titles = suggest_titles(tier, body.jurusan, body.doc_type, body.keyword)
    except Exception as exc:
        log.exception("Saran judul gagal")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "MODEL_ERROR", "message": "Model sedang tidak merespons. Coba lagi sebentar."},
        ) from exc

    if not titles:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "EMPTY_RESULT", "message": "Tidak ada judul yang dihasilkan. Ubah kata kunci lalu coba lagi."},
        )

    return SuggestTitlesResponse(titles=titles, model=tier.model)


@app.post("/api/generate-document")
async def api_generate_document(
    body: GenerateRequest,
    user: CurrentUser = Depends(get_current_user),
):
    tier = get_tier(user.tier)
    _require_active(user)

    common = dict(
        tier=tier,
        doc_type=body.doc_type,
        title=body.title,
        jurusan=body.jurusan,
        catatan=body.catatan,
        panjang=body.panjang,
        metode=body.metode,
        pustaka=body.pustaka,
    )

    if body.engine == "claude":
        # ── Mesin premium Claude ─────────────────────────────────────────────
        if not tier.claude_enabled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "CLAUDE_TIER_LOCKED", "message": "Athena Mode hanya untuk paket Sharnikas & Dikthought."},
            )
        if not claude_available():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={"code": "CLAUDE_UNCONFIGURED", "message": "Athena Mode belum diaktifkan admin. Coba lagi nanti."},
            )
        reservation = claude_reserve(user.uid, tier)
        if not reservation["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "code": "CLAUDE_NO_CREDITS",
                    "message": "Kesempatan Athena Mode sudah habis. Beli tambahan Rp15.000/pemakaian lewat admin (WhatsApp).",
                    "resetAt": reservation.get("resetAt"),
                },
            )
        model_label = tier.claude_model
        source = reservation["source"]

        def make_stream():
            return generate_document_stream_claude(**common)

        def do_refund():
            claude_refund(user.uid, source)
    else:
        # ── Mesin Gemini (kuota harian per paket) ────────────────────────────
        quota = check_and_reserve(user.uid, tier)
        if not quota["allowed"]:
            reset = quota["resetAt"]
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code": "RATE_LIMITED",
                    "message": (
                        f"Kuota paket {tier.name} sudah habis "
                        f"({tier.daily_limit} dokumen per {tier.window_hours} jam). "
                        "Tunggu sampai kuota diperbarui atau naikkan paket."
                    ),
                    "resetAt": reset.isoformat() if reset else None,
                    "limit": tier.daily_limit,
                    "windowHours": tier.window_hours,
                },
            )
        model_label = tier.model

        def make_stream():
            return generate_document_stream(**common)

        def do_refund():
            refund(user.uid)

    def event_stream():
        yield _sse({"type": "status", "stage": "Menyusun kerangka", "percent": 5, "model": model_label})
        try:
            got_text = False
            for piece in make_stream():
                got_text = True
                yield _sse({"type": "chunk", "text": piece})

            if not got_text:
                # Gagal total: kembalikan slot/kredit yang tadi dipesan.
                do_refund()
                yield _sse({"type": "error", "message": "Model tidak mengembalikan teks. Coba ubah judul lalu jalankan lagi."})
                return

            yield _sse({"type": "status", "stage": "Selesai", "percent": 100})
            yield _sse({"type": "done"})
        except Exception:
            log.exception("Streaming dokumen gagal")
            do_refund()
            yield _sse({"type": "error", "message": "Proses terputus di tengah jalan. Jalankan ulang untuk mencoba lagi."})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # cegah buffering di balik nginx
        },
    )


@app.post("/api/admin/claude/{uid}/grant")
async def api_admin_grant_claude(
    uid: str,
    body: ClaudeGrantRequest,
    _: CurrentUser = Depends(require_admin),
):
    """Admin menambah kredit Claude berbayar (Rp15.000/pemakaian) ke pengguna."""
    snap = db.collection("users").document(uid).get()
    if not snap.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NO_USER", "message": "Pengguna tidak ditemukan."},
        )
    return claude_grant(uid, body.count)


@app.get("/api/admin/users")
async def api_admin_users(_: CurrentUser = Depends(require_admin)):
    docs = db.collection("users").order_by("createdAt", direction="DESCENDING").limit(500).stream()
    rows = []
    for d in docs:
        data = d.to_dict()
        created = data.get("createdAt")
        rows.append(
            {
                "uid": d.id,
                "nama": data.get("nama", ""),
                "email": data.get("email", ""),
                "alamat": data.get("alamat", ""),
                "role": data.get("role", "user"),
                "packageTier": data.get("packageTier", "faozonica"),
                "statusSubscription": data.get("statusSubscription", "inactive"),
                "createdAt": created.isoformat() if hasattr(created, "isoformat") else None,
            }
        )
    return rows
