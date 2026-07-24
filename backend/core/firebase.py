"""Inisialisasi Firebase Admin SDK dan verifikasi token pengguna."""

import json

import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as fb_auth, credentials, firestore

from core.config import get_settings

_settings = get_settings()

if not firebase_admin._apps:
    if _settings.firebase_credentials_json:
        cred = credentials.Certificate(json.loads(_settings.firebase_credentials_json))
    else:
        cred = credentials.Certificate(_settings.firebase_credentials_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()
bearer = HTTPBearer(auto_error=False)


class CurrentUser:
    """Identitas pemanggil beserta profilnya di koleksi `users`."""

    def __init__(self, uid: str, profile: dict):
        self.uid = uid
        self.profile = profile
        self.tier: str = profile.get("packageTier", "faozonica")
        self.role: str = profile.get("role", "user")
        self.status: str = profile.get("statusSubscription", "inactive")
        self.is_active: bool = self.status == "active"
        self.nama: str = profile.get("nama", "")
        self.email: str = profile.get("email", "")


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> CurrentUser:
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "NO_TOKEN", "message": "Sesi tidak ditemukan. Masuk kembali untuk melanjutkan."},
        )
    try:
        decoded = fb_auth.verify_id_token(creds.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Sesi sudah berakhir. Masuk kembali untuk melanjutkan."},
        )

    uid = decoded["uid"]
    snap = db.collection("users").document(uid).get()
    if not snap.exists:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "NO_PROFILE", "message": "Profil pengguna belum lengkap. Daftar ulang atau hubungi admin."},
        )
    return CurrentUser(uid, snap.to_dict())


async def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "NOT_ADMIN", "message": "Halaman ini hanya untuk admin."},
        )
    return user
