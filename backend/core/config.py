import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    # Opsional: kunci OpenRouter untuk mesin premium "Athena Mode" (paket
    # Sharnikas & Dikthought). Kalau kosong, Athena Mode otomatis nonaktif dan
    # aplikasi tetap jalan dengan Thunder Mode (Gemini).
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    # Ganti model Athena tanpa mengubah kode. Kosongkan untuk memakai bawaan
    # dari core/tiers.py. Daftar model: https://openrouter.ai/models?q=free
    athena_model: str = os.getenv("ATHENA_MODEL", "")
    firebase_credentials_path: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    firebase_credentials_json: str = os.getenv("FIREBASE_CREDENTIALS_JSON", "")
    allowed_origins: list[str] = [
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()
    ]


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if not s.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY belum diisi di file .env")
    return s
