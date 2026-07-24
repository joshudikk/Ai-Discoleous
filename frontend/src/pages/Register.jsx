import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { AlertTriangle, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { auth, db, signInWithGoogle } from '../lib/firebase'
import { PACKAGES } from '../lib/packages'
import GlassCard from '../components/GlassCard'
import PackageCard from '../components/PackageCard'
import GoogleButton from '../components/GoogleButton'
import BrandBanner from '../components/BrandBanner'

const ERRORS = {
  'auth/email-already-in-use': 'Email ini sudah terdaftar. Masuk saja lewat halaman login.',
  'auth/invalid-email': 'Format email belum benar. Contoh: nama@kampus.ac.id',
  'auth/weak-password': 'Kata sandi minimal 6 karakter.',
  'auth/network-request-failed': 'Koneksi terputus. Periksa jaringan lalu coba lagi.',
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nama: '', alamat: '', email: '', password: '' })
  const [tier, setTier] = useState('sharnikas')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit() {
    setError('')
    if (!form.nama.trim() || !form.alamat.trim() || !form.email.trim() || !form.password) {
      setError('Lengkapi semua kolom sebelum melanjutkan.')
      return
    }
    if (form.password.length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }

    setBusy(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password)
      await updateProfile(cred.user, { displayName: form.nama.trim() })

      // Profil pengguna. statusSubscription menunggu konfirmasi pembayaran dari admin.
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        nama: form.nama.trim(),
        alamat: form.alamat.trim(),
        email: form.email.trim(),
        role: 'user',
        packageTier: tier,
        statusSubscription: 'inactive',
        createdAt: serverTimestamp(),
      })

      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(ERRORS[err.code] ?? 'Pendaftaran gagal diproses. Coba beberapa saat lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setBusy(true)
    try {
      // Paket yang dipilih dipakai sebagai default; langganan tetap 'inactive'
      // sampai pembayaran diverifikasi.
      await signInWithGoogle(tier)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        /* dibatalkan pengguna */
      } else {
        setError('Gagal daftar dengan Google. Coba lagi.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center"
      >
        <BrandBanner className="max-w-lg" />
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-300/70">Buat akun</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white neon-text sm:text-5xl">
          Mulai menyusun dokumen
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
          Isi data diri, pilih paket, lalu langsung masuk ke ruang kerja generator.
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Pilihan paket */}
        <div>
          <p className="label mb-4">01 · Pilih paket langganan</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {PACKAGES.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.45 }}
              >
                <PackageCard pkg={p} selected={tier === p.id} onSelect={setTier} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Form data diri */}
        <motion.div initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <p className="label mb-4">02 · Data diri</p>
          <GlassCard className="p-7">
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="nama">Nama lengkap</label>
                <input id="nama" className="field" value={form.nama} onChange={set('nama')} placeholder="Nama sesuai KTM" />
              </div>
              <div>
                <label className="label" htmlFor="alamat">Alamat</label>
                <input id="alamat" className="field" value={form.alamat} onChange={set('alamat')} placeholder="Kota, provinsi" />
              </div>
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" type="email" className="field" value={form.email} onChange={set('email')} placeholder="nama@kampus.ac.id" />
              </div>
              <div>
                <label className="label" htmlFor="password">Kata sandi</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    className="field pr-11"
                    value={form.password}
                    onChange={set('password')}
                    placeholder="Minimal 6 karakter"
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
                {busy ? 'Membuat akun…' : 'Buat akun'} <ArrowRight size={16} />
              </button>

              <div className="flex items-center gap-3 py-1">
                <span className="rule" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">atau</span>
                <span className="rule" />
              </div>

              <GoogleButton onClick={handleGoogle} busy={busy} label="Daftar dengan Google" />

              <p className="text-center text-xs text-slate-500">
                Sudah punya akun?{' '}
                <Link to="/login" className="text-cyan-neon transition hover:underline">Masuk di sini</Link>
              </p>
            </div>
          </GlassCard>

          <p className="mt-4 px-1 font-mono text-[11px] leading-relaxed text-slate-500">
            Langganan aktif setelah pembayaran dikonfirmasi admin. Sampai saat itu akun berstatus{' '}
            <span className="text-amber-300">inactive</span>.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
