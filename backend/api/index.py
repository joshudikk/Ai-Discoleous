"""Titik masuk untuk Vercel Python Runtime.

Vercel menjalankan berkas di folder `api/` sebagai fungsi. Runtime Python-nya
mengenali variabel `app` sebagai aplikasi ASGI, jadi cukup meneruskan aplikasi
FastAPI dari `main.py` di root proyek backend.

Untuk menjalankan di komputer sendiri, tetap pakai:
    uvicorn main:app --reload --port 8000
"""

import os
import sys

# `main.py` ada satu tingkat di atas folder api/, tambahkan ke jalur impor.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: E402,F401  (diekspor untuk Vercel)
