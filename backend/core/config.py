import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    # Opsional: kunci Anthropic untuk mesin premium Claude (paket Sharnikas &
    # Dikthought). Kalau kosong, fitur Claude otomatis nonaktif.
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
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
