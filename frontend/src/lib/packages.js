// Sumber kebenaran tunggal untuk paket langganan di sisi frontend.
// Harga dan batasan fitur harus sama dengan backend/core/tiers.py.
export const PACKAGES = [
  {
    id: 'faozonica',
    name: 'Faozonica',
    level: 'Tingkat Rendah',
    price: 30000,
    accent: 'cyan',
    model: 'gemini-3.1-flash-lite',
    tagline: 'Draf cepat untuk tugas harian.',
    features: [
      'Makalah, esai, dan KTI',
      '2 dokumen / 24 jam',
      'Kualitas AI standar',
      'Judul ditulis sendiri',
      'Riwayat dokumen tersimpan',
    ],
    locked: ['Saran judul per jurusan', 'Sitasi akademis otomatis'],
  },
  {
    id: 'sharnikas',
    name: 'Sharnikas',
    level: 'Tingkat Medium',
    price: 70000,
    accent: 'violet',
    model: 'gemini-flash-latest',
    tagline: 'Struktur rapi plus rujukan.',
    features: [
      'Semua fitur Faozonica',
      '3 dokumen / 12 jam',
      'Athena Mode — AI premium (1×)',
      'Saran judul berdasarkan jurusan',
      'Kerangka terstruktur + sitasi akademis',
      'Daftar pustaka gaya APA',
    ],
    locked: ['Analisis kritis mendalam'],
  },
  {
    id: 'dikthought',
    name: 'Dikthought',
    level: 'Tingkat Tinggi',
    price: 150000,
    accent: 'lime',
    badge: 'Best Cyber Intelligence',
    model: 'gemini-3.6-flash',
    tagline: 'Analisis mendalam untuk karya ilmiah penuh.',
    features: [
      'Semua fitur Sharnikas',
      '6 dokumen / 4 jam',
      'Athena Mode — AI premium (3×/bulan)',
      'Kualitas AI tertinggi',
      'Argumen kritis dan pembahasan mendalam',
      'Struktur KTI komprehensif (BAB I–V)',
      'Prioritas antrean generate',
    ],
    locked: [],
  },
]

export const getPackage = (id) => PACKAGES.find((p) => p.id === id) ?? PACKAGES[0]

export const canSuggestTitles = (tier) => tier === 'sharnikas' || tier === 'dikthought'

export const formatIDR = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
