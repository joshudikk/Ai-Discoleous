// Pembungkus panggilan ke backend FastAPI.
// Setiap permintaan membawa Firebase ID token supaya backend bisa memverifikasi
// siapa penggunanya dan paket apa yang dia miliki.
import { auth } from './firebase'

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function authHeader() {
  const user = auth.currentUser
  if (!user) throw new Error('Sesi berakhir. Masuk kembali untuk melanjutkan.')
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

/** Ambil daftar saran judul. Melempar error bertanda code='TIER_LOCKED' bila paket tidak cukup. */
export async function suggestTitles({ jurusan, docType, keyword }) {
  const res = await fetch(`${BASE}/api/suggest-titles`, {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ jurusan, doc_type: docType, keyword }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.detail?.message ?? 'Saran judul gagal dimuat.')
    err.code = data.detail?.code ?? 'ERROR'
    throw err
  }
  return data.titles
}

/**
 * Generate dokumen dengan streaming (Server-Sent Events).
 * onChunk(text)  -> dipanggil tiap potongan teks datang
 * onStatus(info) -> dipanggil untuk status/persentase
 */
export async function generateDocument({ docType, title, jurusan, catatan, panjang, metode, pustaka, engine }, { onChunk, onStatus, signal }) {
  const res = await fetch(`${BASE}/api/generate-document`, {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ doc_type: docType, title, jurusan, catatan, panjang, metode, pustaka, engine }),
    signal,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error(data.detail?.message ?? 'Dokumen gagal dibuat.')
    err.code = data.detail?.code ?? 'ERROR'
    err.resetAt = data.detail?.resetAt ?? null
    throw err
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const line = part.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      const payload = JSON.parse(line.slice(6))
      if (payload.type === 'chunk') {
        full += payload.text
        onChunk?.(payload.text)
      } else if (payload.type === 'status') {
        onStatus?.(payload)
      } else if (payload.type === 'error') {
        throw new Error(payload.message)
      }
    }
  }
  return full
}

/** Admin: tolak pengajuan pembayaran (bukti tidak sah). */
export async function rejectPayment(uid) {
  const res = await fetch(`${BASE}/api/admin/payments/${uid}/reject`, {
    method: 'POST',
    headers: await authHeader(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw errorFrom(data, 'Penolakan gagal.')
  return data
}

/** Admin: nonaktifkan langganan pengguna (kembali ke belum aktif). */
export async function deactivateUser(uid) {
  const res = await fetch(`${BASE}/api/admin/users/${uid}/deactivate`, {
    method: 'POST',
    headers: await authHeader(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw errorFrom(data, 'Gagal menonaktifkan.')
  return data
}

/** Sisa kesempatan mesin premium Athena Mode. */
export async function fetchAthenaUsage() {
  const res = await fetch(`${BASE}/api/athena-usage`, { headers: await authHeader() })
  if (!res.ok) throw new Error('Kuota Athena Mode gagal dimuat.')
  return res.json()
}

/** Admin: tambah kredit Athena Mode berbayar ke pengguna. */
export async function grantAthena(uid, count = 1) {
  const res = await fetch(`${BASE}/api/admin/athena/${uid}/grant`, {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ count }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail?.message ?? 'Gagal menambah kredit Athena Mode.')
  return data
}

/** Sisa kuota pembuatan dokumen + waktu pembaruannya. */
export async function fetchUsage() {
  const res = await fetch(`${BASE}/api/usage`, { headers: await authHeader() })
  if (!res.ok) throw new Error('Kuota gagal dimuat.')
  return res.json()
}

export async function fetchAdminUsers() {
  const res = await fetch(`${BASE}/api/admin/users`, { headers: await authHeader() })
  if (!res.ok) throw new Error('Data pengguna gagal dimuat.')
  return res.json()
}

// Ubah balasan error backend ({detail:{code,message}}) jadi Error ber-code.
function errorFrom(data, fallback) {
  const err = new Error(data.detail?.message ?? fallback)
  err.code = data.detail?.code ?? 'ERROR'
  return err
}

/** Pengguna menandai sudah membayar paket tertentu. Status pindah ke 'pending'. */
export async function claimPayment(packageTier, promoCode = '') {
  const res = await fetch(`${BASE}/api/payment/claim`, {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ packageTier, promoCode }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw errorFrom(data, 'Gagal mengirim konfirmasi pembayaran.')
  return data
}

/** Pelanggan memvalidasi kode promo. Melempar error kalau tidak valid. */
export async function checkPromo(code) {
  const res = await fetch(`${BASE}/api/promo/check`, {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ code }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw errorFrom(data, 'Kode promo tidak valid.')
  return data // { code, discountPercent }
}

/** Admin: daftar semua kode promo. */
export async function listPromos() {
  const res = await fetch(`${BASE}/api/admin/promos`, { headers: await authHeader() })
  if (!res.ok) throw new Error('Data promo gagal dimuat.')
  return res.json()
}

/** Admin: buat/perbarui kode promo. */
export async function createPromo(code, discountPercent) {
  const res = await fetch(`${BASE}/api/admin/promos`, {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ code, discountPercent }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw errorFrom(data, 'Gagal membuat promo.')
  return data
}

/** Admin: hapus kode promo. */
export async function deletePromo(code) {
  const res = await fetch(`${BASE}/api/admin/promos/${encodeURIComponent(code)}/delete`, {
    method: 'POST',
    headers: await authHeader(),
  })
  if (!res.ok) throw new Error('Gagal menghapus promo.')
  return res.json()
}

/** Pengguna menukar kode token dari admin. Kalau cocok, langganan jadi aktif. */
export async function redeemToken(token) {
  const res = await fetch(`${BASE}/api/payment/redeem`, {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ token }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw errorFrom(data, 'Aktivasi token gagal.')
  return data
}

/** Admin: daftar pembayaran yang menunggu verifikasi / sudah terbit token. */
export async function fetchAdminPayments() {
  const res = await fetch(`${BASE}/api/admin/payments`, { headers: await authHeader() })
  if (!res.ok) throw new Error('Data pembayaran gagal dimuat.')
  return res.json()
}

/** Admin: verifikasi pembayaran; balasannya memuat kode token untuk diberikan ke pengguna. */
export async function verifyPayment(uid) {
  const res = await fetch(`${BASE}/api/admin/payments/${uid}/verify`, {
    method: 'POST',
    headers: await authHeader(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw errorFrom(data, 'Verifikasi gagal.')
  return data
}
