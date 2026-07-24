import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { AlertTriangle, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { auth, signInWithGoogle } from '../lib/firebase'
import GlassCard from '../components/GlassCard'
import GoogleButton from '../components/GoogleButton'
import BrandBanner from '../components/BrandBanner'

const ERRORS = {
  'auth/invalid-credential': 'Email atau kata sandi tidak cocok.',
  'auth/user-not-found': 'Akun dengan email ini belum terdaftar.',
  'auth/wrong-password': 'Kata sandi salah. Coba lagi atau atur ulang.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu beberapa menit.',
  'auth/network-request-failed': 'Koneksi terputus. Periksa jaringan lalu coba lagi.',
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  async function handleSubmit() {
    setError('')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      navigate(location.state?.from ?? '/dashboard', { replace: true })
    } catch (err) {
      setError(ERRORS[err.code] ?? 'Gagal masuk. Coba beberapa saat lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setGoogleBusy(true)
    try {
      await signInWithGoogle()
      navigate(location.state?.from ?? '/dashboard', { replace: true })
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        /* dibatalkan pengguna */
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('Email ini sudah terdaftar dengan kata sandi. Masuk pakai email & kata sandi.')
      } else {
        setError('Gagal masuk dengan Google. Coba lagi.')
      }
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <BrandBanner />
          <h1 className="mt-5 font-display text-3xl font-bold text-white neon-text">Masuk ke ruang kerja</h1>
          <p className="mt-2 text-sm text-slate-400">Lanjutkan dokumen yang sedang kamu susun.</p>
        </div>

        <GlassCard className="p-8">
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="nama@kampus.ac.id"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label" htmlFor="password">Kata sandi</label>
                <Link to="/lupa-password" className="mb-1.5 font-mono text-[11px] text-cyan-300/70 transition hover:text-cyan-neon">
                  Lupa kata sandi?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="field pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-cyan-neon"
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button onClick={handleSubmit} disabled={busy} className="btn-neon w-full">
              {busy ? 'Memeriksa…' : 'Masuk'} <ArrowRight size={16} />
            </button>

            <div className="flex items-center gap-3 py-1">
              <span className="rule" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">atau</span>
              <span className="rule" />
            </div>

            <GoogleButton onClick={handleGoogle} busy={googleBusy} label="Masuk dengan Google" />

            <div className="rule my-2" />

            <p className="text-center text-xs text-slate-500">
              Belum punya akun?{' '}
              <Link to="/daftar" className="text-cyan-neon transition hover:underline">Daftar sekarang</Link>
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
