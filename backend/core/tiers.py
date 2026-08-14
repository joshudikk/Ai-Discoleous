"""Aturan paket langganan.

Satu tempat untuk menentukan: model Gemini mana yang dipakai, fitur apa yang
terbuka, dan seperti apa instruksi sistem yang dikirim ke model. Nilai di sini
harus sama dengan frontend/src/lib/packages.js.
"""

from dataclasses import dataclass, field

# Model bawaan Athena Mode di OpenRouter. Nemotron 3 Ultra: 550B parameter,
# konteks 1 juta token, dan gratis. Daftar lain: https://openrouter.ai/models?q=free
ATHENA_DEFAULT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free"


@dataclass(frozen=True)
class Tier:
    id: str
    name: str
    price: int
    model: str
    can_suggest_titles: bool
    temperature: float
    max_output_tokens: int
    # Kuota pembuatan dokumen: maksimal `daily_limit` output per jendela
    # `window_hours` jam. Kuota diperbarui saat jendela berakhir.
    daily_limit: int = 2
    window_hours: int = 24
    # Mesin premium "Athena Mode" (lewat OpenRouter). `athena_free` = jatah gratis
    # per periode: athena_period "never" = seumur akun, "month" = per bulan.
    # Kredit tambahan (Rp15.000/pemakaian) diberikan admin setelah jatah habis.
    # Model bisa ditimpa lewat ATHENA_MODEL di .env tanpa mengubah kode.
    athena_enabled: bool = False
    athena_model: str = ATHENA_DEFAULT_MODEL
    athena_free: int = 0
    athena_period: str = "never"
    style: str = field(default="")


TIERS: dict[str, Tier] = {
    "faozonica": Tier(
        id="faozonica",
        name="Faozonica",
        price=30_000,
        model="gemini-3.1-flash-lite",
        can_suggest_titles=False,
        temperature=0.8,
        max_output_tokens=4096,
        daily_limit=2,
        window_hours=24,
        style=(
            "Tulis dengan bahasa Indonesia akademik yang lugas dan mudah diikuti. "
            "Cukup uraikan pokok bahasan secara runtut tanpa sitasi formal."
        ),
    ),
    "sharnikas": Tier(
        id="sharnikas",
        name="Sharnikas",
        price=70_000,
        model="gemini-flash-latest",
        can_suggest_titles=True,
        temperature=0.7,
        max_output_tokens=8192,
        daily_limit=3,
        window_hours=12,
        athena_enabled=True,
        athena_free=1,
        athena_period="never",
        style=(
            "Tulis dengan struktur akademik yang rapi dan bernomor. Sertakan sitasi "
            "dalam teks bergaya APA (Nama, tahun) pada klaim penting, lalu tutup "
            "dengan Daftar Pustaka. Tandai setiap rujukan yang perlu diverifikasi "
            "penulis dengan catatan singkat [verifikasi sumber]."
        ),
    ),
    "dikthought": Tier(
        id="dikthought",
        name="Dikthought",
        price=150_000,
        # Model "pro" (gemini-*-pro) TIDAK tersedia di free tier (429/limit 0),
        # dan gemini-2.5-flash sudah 404 untuk key baru. Pakai flash Gemini 3
        # terbaru yang tersedia gratis. Kalau billing diaktifkan, boleh ganti ke
        # "gemini-3-pro-preview" / "gemini-pro-latest" untuk kualitas maksimal.
        model="gemini-3.6-flash",
        can_suggest_titles=True,
        temperature=0.6,
        max_output_tokens=16384,
        daily_limit=6,
        window_hours=4,
        athena_enabled=True,
        athena_free=3,
        athena_period="month",
        style=(
            "Tulis pada tingkat analisis mendalam: bandingkan sudut pandang, ajukan "
            "argumen kritis beserta bantahannya, hubungkan temuan dengan kerangka "
            "teori yang relevan, dan tunjukkan celah penelitian. Sertakan sitasi "
            "bergaya APA serta Daftar Pustaka. Tandai rujukan yang perlu "
            "diverifikasi penulis dengan [verifikasi sumber]."
        ),
    ),
}

DEFAULT_TIER = "faozonica"


def get_tier(tier_id: str | None) -> Tier:
    return TIERS.get(tier_id or DEFAULT_TIER, TIERS[DEFAULT_TIER])


# ── Kerangka per jenis dokumen ────────────────────────────────────────────────

OUTLINES = {
    "makalah": (
        "Struktur wajib:\n"
        "HALAMAN JUDUL (judul, sub-judul bila perlu)\n"
        "KATA PENGANTAR\n"
        "DAFTAR ISI\n"
        "BAB I PENDAHULUAN — 1.1 Latar Belakang, 1.2 Rumusan Masalah, 1.3 Tujuan, 1.4 Manfaat\n"
        "BAB II PEMBAHASAN — beberapa sub-bab sesuai rumusan masalah\n"
        "BAB III PENUTUP — 3.1 Kesimpulan, 3.2 Saran\n"
        "DAFTAR PUSTAKA"
    ),
    "esai": (
        "Struktur wajib (mengalir, tanpa penomoran bab):\n"
        "Judul\n"
        "Paragraf pembuka berisi kait pembaca dan pernyataan tesis\n"
        "Tiga sampai lima paragraf isi; satu paragraf satu gagasan, disertai bukti atau contoh\n"
        "Paragraf penutup yang menegaskan ulang tesis dan menutup dengan implikasi"
    ),
    "kti": (
        "Struktur wajib:\n"
        "HALAMAN JUDUL, ABSTRAK (150-250 kata + kata kunci)\n"
        "BAB I PENDAHULUAN — Latar Belakang, Rumusan Masalah, Tujuan, Manfaat, Batasan Masalah\n"
        "BAB II TINJAUAN PUSTAKA — landasan teori, penelitian terdahulu, kerangka berpikir\n"
        "BAB III METODE PENELITIAN — jenis penelitian, populasi/sampel, teknik pengumpulan "
        "dan analisis data\n"
        "BAB IV HASIL DAN PEMBAHASAN\n"
        "BAB V PENUTUP — Kesimpulan dan Saran\n"
        "DAFTAR PUSTAKA"
    ),
}

LENGTH_HINT = {
    "ringkas": "Panjang sekitar 900-1.300 kata.",
    "standar": "Panjang sekitar 1.800-2.500 kata.",
    "lengkap": "Panjang minimal 3.500 kata, bahas tiap bagian secara menyeluruh.",
}

METODE_HINT = {
    "kualitatif": (
        "Gunakan pendekatan penelitian KUALITATIF (deskriptif/interpretatif, "
        "tanpa pengolahan angka statistik). Jelaskan pendekatan ini pada bagian "
        "metode penelitian bila ada."
    ),
    "kuantitatif": (
        "Gunakan pendekatan penelitian KUANTITATIF (berbasis data/angka, "
        "pengukuran, dan analisis statistik). Jelaskan pendekatan ini pada bagian "
        "metode penelitian bila ada."
    ),
    "campuran": (
        "Gunakan METODE CAMPURAN (mixed methods) yang memadukan pendekatan "
        "kualitatif dan kuantitatif. Jelaskan keduanya pada bagian metode penelitian."
    ),
    "tidak": "",
}

PUSTAKA_HINT = {
    "5": "Utamakan rujukan/sumber terbitan 5 tahun terakhir pada Daftar Pustaka.",
    "10": "Utamakan rujukan/sumber terbitan 10 tahun terakhir pada Daftar Pustaka.",
    "bebas": "",
}

DOC_LABEL = {"makalah": "Makalah", "esai": "Esai", "kti": "Karya Tulis Ilmiah"}


def build_system_instruction(tier: Tier, doc_type: str) -> str:
    label = DOC_LABEL.get(doc_type, "Makalah")
    penegasan_jenis = (
        f"JENIS DOKUMEN YANG DIMINTA: {label}. Ikuti PERSIS struktur {label} pada "
        "bagian 'Struktur wajib' di bawah, dan JANGAN memakai struktur jenis lain. "
    )
    if doc_type == "esai":
        penegasan_jenis += (
            "Esai ditulis mengalir dalam paragraf tanpa penomoran BAB, tanpa "
            "sub-bab bernomor, dan tanpa daftar isi. "
        )
    else:
        penegasan_jenis += "Gunakan penomoran BAB dan sub-bab sesuai struktur. "

    return (
        "Kamu adalah asisten penulisan akademik berbahasa Indonesia yang membantu "
        "mahasiswa menyusun draf tulisan.\n\n"
        f"{penegasan_jenis}\n\n"
        f"{tier.style}\n\n"
        "Aturan yang tidak boleh dilanggar:\n"
        "- Keluarkan hanya isi dokumen dalam format Markdown. Tanpa basa-basi pembuka "
        "atau penutup di luar dokumen.\n"
        "- Jangan mengarang data statistik, kutipan, atau sumber yang tidak kamu yakini. "
        "Bila sebuah angka atau rujukan hanya perkiraan, tandai dengan [verifikasi sumber].\n"
        "- Bagian DAFTAR PUSTAKA (bila ada) wajib ditulis dengan format APA edisi ke-7 "
        "(American Psychological Association) dan diurutkan secara alfabetis berdasarkan "
        "nama belakang penulis.\n"
        "- Setiap tabel WAJIB memakai format tabel Markdown (baris `| Kolom | Kolom |` "
        "diikuti pemisah `|---|---|`). Jangan membuat tabel dari spasi/ASCII art.\n"
        "- Tulis rumus matematika dengan notasi teks Unicode biasa, mis. x², √x, Σ, ≤, α, "
        "(a+b)/c. JANGAN memakai sintaks LaTeX seperti $, \\frac, \\times, atau \\begin"
        "{equation} — dokumen ini diekspor ke Microsoft Word.\n"
        "- Hasil ini adalah draf yang masih harus diperiksa, disunting, dan diuji "
        "kebenarannya oleh penulis.\n\n"
        f"{OUTLINES.get(doc_type, OUTLINES['makalah'])}"
    )


def build_prompt(
    doc_type: str,
    title: str,
    jurusan: str,
    catatan: str,
    panjang: str,
    metode: str = "tidak",
    pustaka: str = "bebas",
) -> str:
    parts = [
        f"Susun {DOC_LABEL.get(doc_type, 'Makalah')} dengan judul: \"{title}\".",
        f"Bidang/jurusan: {jurusan}." if jurusan else "",
        LENGTH_HINT.get(panjang, LENGTH_HINT["standar"]),
        METODE_HINT.get(metode, ""),
        PUSTAKA_HINT.get(pustaka, ""),
    ]
    if catatan:
        parts.append(f"Permintaan tambahan dari penulis: {catatan}")
    return "\n".join(p for p in parts if p)


def build_title_prompt(jurusan: str, doc_type: str, keyword: str) -> str:
    base = (
        f"Buat 8 usulan judul {DOC_LABEL.get(doc_type, 'Makalah')} untuk mahasiswa "
        f"jurusan {jurusan}. Judul harus spesifik, dapat diteliti, dan relevan dengan "
        "konteks Indonesia terkini. Hindari judul yang terlalu umum."
    )
    if keyword:
        base += f" Kaitkan dengan kata kunci: {keyword}."
    return base
