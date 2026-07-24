import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-300/70">404</p>
      <h1 className="mt-3 font-display text-4xl font-bold text-white neon-text">Halaman tidak ada</h1>
      <p className="mt-3 max-w-sm text-sm text-slate-400">
        Alamat yang kamu buka tidak terdaftar di aplikasi ini.
      </p>
      <Link to="/dashboard" className="btn-neon mt-8">Kembali ke dasbor</Link>
    </div>
  )
}
