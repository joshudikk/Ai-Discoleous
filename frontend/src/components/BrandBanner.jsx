import { useState } from 'react'

/**
 * Banner merek Discoleous.
 *
 * Mengambil `public/logo.png`. Kalau berkasnya belum ada (atau gagal dimuat),
 * otomatis jatuh ke wordmark teks supaya halaman tidak menampilkan gambar rusak.
 */
export default function BrandBanner({ className = '' }) {
  const [gagal, setGagal] = useState(false)

  if (gagal) {
    return (
      <div className={`text-center ${className}`}>
        <span className="font-display text-3xl font-bold tracking-wide text-white">
          Disco<span className="text-cyan-neon neon-text">leous</span>
        </span>
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-300/70">
          Solusi AI Pendidikan Anda
        </p>
      </div>
    )
  }

  return (
    <img
      src="/logo.png"
      alt="Discoleous — Solusi AI Pendidikan Anda"
      onError={() => setGagal(true)}
      className={`mx-auto w-full rounded-xl border border-cyan-500/25 shadow-neon ${className}`}
    />
  )
}
