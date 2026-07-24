// Detail pembayaran & kontak admin.
// GANTI "a.n." di bawah dengan nama pemilik rekening yang benar.

// Nomor WhatsApp admin dalam format internasional (untuk tautan wa.me).
export const ADMIN_WA = '6285213192492'
export const ADMIN_WA_DISPLAY = '0852-1319-2492'

// Rekening / e-wallet tujuan pembayaran.
export const PAYMENT_ACCOUNTS = [
  { method: 'BSI', label: 'Bank Syariah Indonesia', number: '7314243778', holder: 'a.n. Andika Fauzi Ilham Nugraha' },
  { method: 'DANA', label: 'DANA', number: '081779010380', holder: 'a.n. —' },
]

// Bangun tautan WhatsApp; pesan opsional akan otomatis terisi di chat.
export const waLink = (text = '') =>
  `https://wa.me/${ADMIN_WA}${text ? `?text=${encodeURIComponent(text)}` : ''}`
