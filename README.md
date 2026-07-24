# Discoleous — Makalah, Esai & Karya Tulis Ilmiah

Aplikasi web pembuat dokumen akademik berbasis Gemini, dengan tampilan gelap
cyber-futuristik: mesh partikel di latar, kartu glassmorphism, dan aksen neon.

- **Frontend** — React 18 + Vite, Tailwind CSS, Framer Motion, Lucide
- **Backend** — Python FastAPI + SDK resmi `google-genai`
- **Data & sesi** — Firebase Authentication + Cloud Firestore

---

## Struktur folder

```
dokumen-ai/
├── firestore.rules             Aturan keamanan Firestore
├── frontend/
│   ├── index.html              Muat font Chakra Petch / Sora / JetBrains Mono
│   ├── tailwind.config.js      Palet neon, bayangan glow, keyframes
│   ├── .env.example
│   └── src/
│       ├── main.jsx            Entry + BrowserRouter + AuthProvider
│       ├── App.jsx             Semua rute
│       ├── index.css           Kelas .glass, .btn-neon, .field, .neon-text
│       ├── lib/
│       │   ├── firebase.js     Inisialisasi Firebase (Auth + Firestore)
│       │   ├── packages.js     Definisi 3 paket langganan
│       │   └── api.js          Panggilan ke FastAPI, termasuk pembaca SSE
│       ├── context/
│       │   └── AuthContext.jsx Sesi + profil Firestore (paket, role, status)
│       ├── components/
│       │   ├── DigitalBackground.jsx  Canvas mesh + orb ambient + garis pindai
│       │   ├── GlassCard.jsx          Kartu kaca dengan siku neon
│       │   ├── CyberLoader.jsx        Progres AI: tahap, persen, jumlah kata
│       │   ├── UpgradeModal.jsx       Modal neon saat fitur terkunci
│       │   ├── PackageCard.jsx        Kartu paket, Dikthought berbintang
│       │   ├── TopBar.jsx
│       │   ├── BootScreen.jsx
│       │   └── ProtectedRoute.jsx
│       └── pages/
│           ├── Register.jsx           Data diri + pilih paket
│           ├── Login.jsx
│           ├── ForgotPassword.jsx     Reset via Firebase Auth
│           ├── Dashboard.jsx          Pilih Makalah / Esai / KTI
│           ├── GeneratorWindow.jsx    Ruang kerja penulisan + streaming
│           ├── Packages.jsx
│           ├── AdminDashboard.jsx     Pengguna, langganan, tagihan
│           └── NotFound.jsx
└── backend/
    ├── main.py                 Endpoint FastAPI
    ├── requirements.txt
    ├── .env.example
    ├── core/
    │   ├── config.py           Baca .env
    │   ├── firebase.py         Verifikasi ID token + ambil profil
    │   ├── schemas.py          Model Pydantic
    │   └── tiers.py            Aturan paket, prompt, kerangka dokumen
    └── services/
        └── gemini_service.py   Streaming dokumen + saran judul (JSON)
```

---

## Menjalankan di komputer sendiri

### 1. Firebase

1. Buat proyek di console.firebase.google.com.
2. **Authentication → Sign-in method** → aktifkan *Email/Password*.
3. **Firestore Database** → buat database, lalu tempel isi `firestore.rules`
   ke tab **Rules** dan publikasikan.
4. **Project settings → General → Your apps → Web** → salin konfigurasi ke
   `frontend/.env`.
5. **Project settings → Service accounts → Generate new private key** → simpan
   sebagai `backend/serviceAccountKey.json`.

Tidak perlu indeks komposit apa pun — riwayat dokumen tidak disimpan di
Firestore (lihat *Penyimpanan data* di bawah).

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # isi GEMINI_API_KEY
uvicorn main:app --reload --port 8000
```

Kunci Gemini diambil dari https://aistudio.google.com/apikey.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env        # isi konfigurasi Firebase
npm run dev
```

Buka http://localhost:5173.

### 4. Membuat akun admin

Tidak ada login admin terpisah — admin memakai halaman login yang sama. Sebuah
akun menjadi admin lewat satu field di Firestore. Daftar seperti pengguna biasa
(mis. `chinesefzy@gmail.com`), lalu di Firestore ubah dokumen `users/{uid}`:
`role` → `admin` dan `statusSubscription` → `active`. Menu **Admin** langsung
muncul di bilah atas setelah login ulang.

---

## Penyimpanan data

Isi dokumen hasil generate **tidak pernah disimpan di server**. Dokumen tinggal
di perangkat pengguna (`localStorage` peramban, lihat `frontend/src/lib/localDocs.js`),
maksimal 20 dokumen terbaru per akun.

| Data | Di mana |
|---|---|
| Isi dokumen hasil generate | **Perangkat pengguna** (localStorage) |
| Akun & profil (nama, email, alamat, role) | Firestore `users` |
| Status langganan & paket | Firestore `users` |
| Pengajuan & token aktivasi | Firestore `activations` (dikunci dari klien) |
| Kuota pemakaian & kredit Athena | Firestore `usage`, `claude` (dikunci dari klien) |

Konsekuensi yang perlu diberitahukan ke pengguna: dokumen **tidak berpindah
antar perangkat/peramban**, dan **hilang bila data peramban dibersihkan**. Karena
itu tombol **Word** (unduh) adalah cara menyimpan permanen.

---

## Mesin premium Claude (Anthropic)

Selain Gemini, paket Sharnikas & Dikthought bisa memakai **Claude
(`claude-opus-4-8`)** sebagai mesin premium, dengan kesempatan terbatas:

| Paket | Kesempatan Claude gratis | Beli tambahan |
|---|---|---|
| Sharnikas | 1× (seumur akun) | Rp15.000 / pemakaian |
| Dikthought | 3× per bulan | Rp15.000 / pemakaian |

Isi `ANTHROPIC_API_KEY` di `backend/.env` untuk mengaktifkan. Kalau kosong,
toggle Claude tidak muncul dan aplikasi tetap jalan dengan Gemini. Kredit
tersimpan di koleksi `claude/{uid}` (dikunci total oleh aturan Firestore).

**Beli tambahan:** pengguna transfer Rp15.000 → konfirmasi ke admin via WhatsApp
→ admin menekan **+Claude** pada baris pengguna di panel Admin (menambah 1 kredit
lewat `POST /api/admin/claude/{uid}/grant`). Penghitungan dilakukan atomik lewat
transaksi Firestore, jadi batasnya tidak bisa ditembus dari klien.

---

## Alur pembayaran & aktivasi token

Langganan diaktifkan lewat token, dengan admin sebagai penjaga:

1. Pengguna memilih paket, transfer ke rekening (BSI / DANA), lalu menekan
   **Saya sudah bayar** → status `pending`.
2. Admin membuka panel **Admin**, mencocokkan bukti transfer, lalu menekan
   **Verifikasi**. Sistem membuat **kode token 8 karakter** dan menampilkannya
   di panel admin → status `verified`.
3. Pengguna menghubungi admin lewat WhatsApp untuk meminta kode token, lalu
   memasukkannya di halaman **Langganan**. Token cocok → status `active`.

Token disimpan di koleksi terpisah `activations/{uid}` yang **ditolak total oleh
aturan Firestore** — hanya backend (Admin SDK) yang menyentuhnya. Ini mencegah
pengguna membaca tokennya sendiri langsung dari Firestore tanpa menghubungi
admin. Detail rekening dan nomor WhatsApp diatur di `frontend/src/lib/payment.js`.

---

## Aturan paket

| Paket | Harga | Model | Kuota | Saran judul | Gaya penulisan |
|---|---|---|---|---|---|
| Faozonica | Rp30.000 | `gemini-3.1-flash-lite` | 2 dok / 24 jam | terkunci | prompt standar |
| Sharnikas | Rp70.000 | `gemini-flash-latest` | 3 dok / 12 jam | tersedia | terstruktur + sitasi APA |
| Dikthought | Rp150.000 | `gemini-3.6-flash` | 6 dok / 4 jam | tersedia | analisis kritis, struktur KTI penuh |

> Model `*-pro` (gemini-2.5-pro dll.) tidak tersedia di **free tier** Gemini
> (kuota 0), dan `gemini-2.5-flash` sudah 404 untuk key baru. Karena itu semua
> paket memakai model **flash Gemini 3** yang gratis. Kalau billing Google Cloud
> diaktifkan, model `pro` bisa dipasang kembali di `backend/core/tiers.py`.

Aturan ini ditulis dua kali dengan sengaja: `frontend/src/lib/packages.js` untuk
tampilan, `backend/core/tiers.py` untuk penegakan. Yang menentukan adalah
backend — tombol yang disembunyikan di UI tetap bisa dipanggil langsung lewat
HTTP, jadi setiap endpoint memeriksa ulang paket pengguna dari Firestore.

Saat pengguna Faozonica menekan **Saran judul**, frontend menampilkan modal
tanpa memanggil server. Kalau permintaan tetap dikirim (misalnya lewat curl),
backend membalas `403` dengan `code: "TIER_LOCKED"` dan pesan yang sama.

---

## Endpoint

| Metode | Alamat | Keterangan |
|---|---|---|
| `GET` | `/health` | Cek server hidup |
| `GET` | `/api/me` | Profil + paket pemanggil |
| `POST` | `/api/suggest-titles` | 8 usulan judul per jurusan (Sharnikas/Dikthought) |
| `POST` | `/api/generate-document` | Streaming SSE isi dokumen |
| `GET` | `/api/claude-usage` | Sisa kesempatan mesin premium Claude |
| `POST` | `/api/admin/claude/{uid}/grant` | Admin menambah kredit Claude berbayar (khusus admin) |
| `POST` | `/api/payment/claim` | Pengguna menandai sudah bayar → status `pending` |
| `POST` | `/api/payment/redeem` | Pengguna menukar kode token → status `active` |
| `GET` | `/api/admin/payments` | Daftar pembayaran menunggu (khusus admin) |
| `POST` | `/api/admin/payments/{uid}/verify` | Admin verifikasi, sistem terbitkan token (khusus admin) |
| `GET` | `/api/admin/users` | Daftar pengguna (khusus admin) |

Semua endpoint `/api/*` memerlukan header `Authorization: Bearer <Firebase ID token>`.

Format pesan streaming:

```
data: {"type":"status","stage":"Menyusun kerangka","percent":5}
data: {"type":"chunk","text":"BAB I PENDAHULUAN…"}
data: {"type":"done"}
```

---

## Deploy ke Vercel

Dibuat **dua proyek Vercel** dari repositori yang sama: satu untuk frontend, satu
untuk backend. Berkas konfigurasinya sudah disiapkan (`frontend/vercel.json`,
`backend/vercel.json`, `backend/api/index.py`, `backend/.vercelignore`).

### Proyek 1 — Backend

| Pengaturan | Nilai |
|---|---|
| Root Directory | `backend` |
| Framework Preset | Other |

Environment Variables:

| Nama | Isi |
|---|---|
| `GEMINI_API_KEY` | kunci dari aistudio.google.com/apikey |
| `ANTHROPIC_API_KEY` | kunci Anthropic (opsional; kosongkan bila Athena Mode belum dipakai) |
| `FIREBASE_CREDENTIALS_JSON` | **isi** `serviceAccountKey.json` (satu baris) |
| `ALLOWED_ORIGINS` | domain frontend, mis. `https://discoleous.vercel.app` |

Jangan mengunggah `serviceAccountKey.json` maupun `.env` — keduanya sudah
dikecualikan lewat `.vercelignore` dan `.gitignore`.

### Proyek 2 — Frontend

| Pengaturan | Nilai |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite |

Environment Variables: seluruh `VITE_FIREBASE_*` (sama dengan `frontend/.env`)
ditambah `VITE_API_BASE_URL` = URL backend yang sudah live.

### Setelah deploy

1. **Firebase Console → Authentication → Settings → Authorized domains** →
   tambahkan domain frontend, jika tidak login Google akan ditolak.
2. **Firestore → Rules** → tempel isi `firestore.rules` lalu Publish.
3. Pastikan `ALLOWED_ORIGINS` di backend memuat domain frontend, lalu redeploy
   backend agar variabel terbaca.

### Batas durasi fungsi

Vercel Hobby membatasi satu permintaan **60 detik** (`maxDuration` di
`backend/vercel.json`). Dokumen panjang bisa melewatinya. Pilihan:

- **Vercel Pro** → ubah `maxDuration` menjadi `300`;
- batasi pemakaian ke panjang *Ringkas*/*Standar*; atau
- pindahkan backend ke Railway/Render (frontend tetap di Vercel) — cukup ganti
  `VITE_API_BASE_URL`, kode tidak perlu diubah.

Catatan: pada runtime Python Vercel, respons SSE dapat ter-buffer sehingga
dokumen muncul sekaligus di akhir, bukan mengalir kata demi kata. Hasil akhirnya
tetap sama.

---

## Catatan

Keluaran model adalah draf. Sitasi dan angka yang belum pasti ditandai
`[verifikasi sumber]` oleh instruksi sistem, dan tetap harus diperiksa penulis
sebelum dikumpulkan. Periksa juga aturan kampus soal penggunaan AI dalam tugas.
