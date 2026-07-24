// Penyimpanan dokumen hasil generate — TETAP DI PERANGKAT PENGGUNA (localStorage).
//
// Isi dokumen tidak pernah dikirim atau disimpan ke server/Firestore. Yang
// tersimpan di server hanya data akun, langganan, dan pembayaran. Konsekuensinya:
// dokumen tidak ikut berpindah antar perangkat/browser, dan hilang kalau data
// peramban dibersihkan.

const KEY = (uid) => `discoleous:docs:${uid || 'anon'}`

// localStorage biasanya dibatasi ~5 MB. Simpan 20 dokumen terbaru saja.
const MAX_DOCS = 20

function readAll(uid) {
  try {
    const raw = localStorage.getItem(KEY(uid))
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeAll(uid, docs) {
  try {
    localStorage.setItem(KEY(uid), JSON.stringify(docs))
    return true
  } catch {
    return false // kuota penuh atau penyimpanan diblokir (mode privat)
  }
}

/** Daftar dokumen milik pengguna, terbaru di atas. */
export function listDocs(uid) {
  return readAll(uid).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

/** Ambil satu dokumen berdasarkan id. */
export function getDoc(uid, id) {
  return readAll(uid).find((d) => d.id === id) ?? null
}

/** Simpan dokumen baru. Mengembalikan item tersimpan, atau null kalau gagal. */
export function saveDoc(uid, { type, title, content }) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    content,
    createdAt: Date.now(),
  }
  const rest = readAll(uid)
  if (writeAll(uid, [item, ...rest].slice(0, MAX_DOCS))) return item
  // Penyimpanan penuh: pangkas lebih agresif lalu coba lagi.
  if (writeAll(uid, [item, ...rest].slice(0, 5))) return item
  return null
}

/** Hapus satu dokumen dari perangkat. */
export function deleteDoc(uid, id) {
  writeAll(uid, readAll(uid).filter((d) => d.id !== id))
}
