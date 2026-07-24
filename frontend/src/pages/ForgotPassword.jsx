import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { sendPasswordResetEmail } from 'firebase/auth'
import { AlertTriangle, ArrowLeft, MailCheck, Send } from 'lucide-react'
import { auth } from '../lib/firebase'
import GlassCard from '../components/GlassCard'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit() {
    setError('')
    if (!email.trim()) {
      setError('Isi email yang dipakai saat mendaftar.')
      return
    }
    setBusy(true)
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setSent(true)
    } catch (err) {
      setError(
        err.code === 'auth/invalid-email'
          ? 'Format email belum benar.'
          : 'Tautan gagal dikirim. Coba beberapa saat lagi.',
      )
    } finally {
      setBusy(false)
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
        <GlassCard className="p-8">
          {sent ? (
            <div className="text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full
                               border border-lime-cyber/50 bg-lime-cyber/10 text-lime-cyber shadow-lime animate-pulse-glow">
                <MailCheck size={26} />
              </span>
              <h1 className="mt-5 font-display text-2xl font-bold text-white neon-text-lime">Tautan terkirim</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Buka email <span className="font-mono text-cyan-200">{email}</span> dan ikuti tautan di sana untuk
                membuat kata sandi baru. Tautan berlaku satu jam.
              </p>
              <p className="mt-4 text-xs text-slate-500">Tidak ada di kotak masuk? Periksa folder spam.</p>
              <Link to="/login" className="btn-ghost mt-7 w-full justify-center">
                <ArrowLeft size={14} /> Kembali ke halaman masuk
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-white neon-text">Atur ulang kata sandi</h1>
              <p className="mt-2 text-sm text-slate-400">
                Masukkan email akunmu. Kami kirimkan tautan untuk membuat kata sandi baru.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="label" htmlFor="email">Email terdaftar</label>
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

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button onClick={handleSubmit} disabled={busy} className="btn-neon w-full">
                  {busy ? 'Mengirim…' : 'Kirim tautan'} <Send size={15} />
                </button>

                <Link to="/login" className="block text-center text-xs text-slate-500 transition hover:text-cyan-neon">
                  Kembali ke halaman masuk
                </Link>
              </div>
            </>
          )}
        </GlassCard>
      </motion.div>
    </div>
  )
}
