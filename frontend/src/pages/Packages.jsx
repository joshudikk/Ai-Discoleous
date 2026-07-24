import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Copy,
  Check,
  MessageCircle,
  KeyRound,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { PACKAGES, getPackage, formatIDR } from '../lib/packages'
import { PAYMENT_ACCOUNTS, waLink, ADMIN_WA_DISPLAY } from '../lib/payment'
import { claimPayment, redeemToken } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import PackageCard from '../components/PackageCard'
import GlassCard from '../components/GlassCard'

export default function Packages() {
  const { profile, tier, status } = useAuth()
  const [selected, setSelected] = useState(tier)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  const selectedPkg = getPackage(selected)
  const currentPkg = getPackage(profile?.packageTier)

  const copy = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      /* clipboard bisa diblokir; abaikan saja */
    }
  }

  async function handleClaim() {
    setError('')
    setBusy(true)
    try {
      // Status berubah lewat Firestore onSnapshot -> AuthContext, UI ikut pindah sendiri.
      await claimPayment(selected)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRedeem() {
    if (!token.trim()) return
    setError('')
    setBusy(true)
    try {
      await redeemToken(token.trim())
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const waPesan = `Halo admin Discoleous, saya sudah membayar paket ${currentPkg.name} (${formatIDR(
    currentPkg.price,
  )}). Email akun: ${profile?.email ?? '-'}. Mohon kirim kode token aktivasi.`

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500 transition hover:text-cyan-neon"
      >
        <ArrowLeft size={13} /> Dasbor
      </Link>

      <h1 className="mt-3 font-display text-3xl font-bold text-white neon-text sm:text-4xl">Langganan</h1>

      {/* ── Sudah aktif ─────────────────────────────────────────────── */}
      {status === 'active' && (
        <GlassCard className="mt-6 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-lime-cyber/50 bg-lime-cyber/10 text-lime-cyber shadow-lime">
              <ShieldCheck size={20} />
            </span>
            <div>
              <p className="font-display text-lg font-bold text-white">Langganan aktif</p>
              <p className="text-sm text-slate-400">
                Paket <span className="text-lime-cyber">{currentPkg.name}</span> — generator sudah bisa dipakai.
              </p>
            </div>
          </div>
          <Link to="/dashboard" className="btn-neon mt-6 w-full justify-center sm:w-auto">
            Mulai menulis <ArrowRight size={16} />
          </Link>
        </GlassCard>
      )}

      {/* ── Menunggu verifikasi / masukkan token ────────────────────── */}
      {(status === 'pending' || status === 'verified') && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <GlassCard className="p-6">
            <p className="label mb-3">Status pembayaran</p>
            {status === 'pending' ? (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3.5">
                <Clock size={18} className="mt-0.5 shrink-0 text-amber-300" />
                <p className="text-sm text-amber-100">
                  Konfirmasi terkirim. <span className="text-amber-300">Menunggu admin memverifikasi</span> pembayaranmu.
                  Setelah diverifikasi, minta kode token ke admin lewat WhatsApp.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-lime-cyber/40 bg-lime-cyber/10 px-4 py-3.5">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-lime-cyber" />
                <p className="text-sm text-lime-100">
                  Pembayaran <span className="text-lime-cyber">sudah diverifikasi</span>. Minta kode token ke admin lewat
                  WhatsApp, lalu masukkan di sebelah untuk mengaktifkan.
                </p>
              </div>
            )}

            <a href={waLink(waPesan)} target="_blank" rel="noreferrer" className="btn-neon mt-5 w-full justify-center">
              <MessageCircle size={16} /> Chat admin ({ADMIN_WA_DISPLAY})
            </a>
            <p className="mt-3 font-mono text-[11px] leading-relaxed text-slate-500">
              Paket dipilih: <span className="text-cyan-200">{currentPkg.name}</span> · {formatIDR(currentPkg.price)}
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <p className="label mb-3">Masukkan kode token</p>
            <label className="label" htmlFor="token">
              Kode dari admin
            </label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                placeholder="mis. K7XM2QP9"
                maxLength={16}
                className="field pl-10 font-mono tracking-[0.25em]"
              />
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button onClick={handleRedeem} disabled={busy || !token.trim()} className="btn-neon mt-4 w-full justify-center">
              {busy ? 'Memeriksa…' : 'Aktifkan langganan'} <ArrowRight size={16} />
            </button>
          </GlassCard>
        </div>
      )}

      {/* ── Belum bayar: pilih paket + rekening + tombol sudah bayar ─── */}
      {status !== 'active' && status !== 'pending' && status !== 'verified' && (
        <>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Pilih paket, transfer ke salah satu rekening di bawah, lalu tekan{' '}
            <span className="text-cyan-200">Saya sudah bayar</span>. Admin akan memverifikasi dan memberi kode token
            aktivasi lewat WhatsApp.
          </p>

          <p className="label mb-4 mt-8">01 · Pilih paket</p>
          <div className="grid gap-6 md:grid-cols-3">
            {PACKAGES.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <PackageCard pkg={p} selected={selected === p.id} onSelect={setSelected} />
              </motion.div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <GlassCard className="p-6">
              <p className="label mb-4">02 · Transfer ke salah satu rekening</p>
              <div className="space-y-3">
                {PAYMENT_ACCOUNTS.map((a) => (
                  <div
                    key={a.method}
                    className="flex items-center justify-between gap-3 rounded-xl border border-cyan-500/20 bg-void/40 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/70">{a.label}</p>
                      <p className="mt-0.5 truncate font-mono text-base text-white">{a.number}</p>
                      <p className="font-mono text-[11px] text-slate-500">{a.holder}</p>
                    </div>
                    <button
                      onClick={() => copy(a.number, a.method)}
                      className="btn-ghost shrink-0"
                      title="Salin nomor"
                    >
                      {copied === a.method ? <Check size={14} className="text-lime-cyber" /> : <Copy size={14} />}
                      <span className="hidden sm:inline">{copied === a.method ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-4 font-mono text-[11px] leading-relaxed text-slate-500">
                Nominal: <span className="text-cyan-200">{formatIDR(selectedPkg.price)}</span> untuk paket{' '}
                <span className="text-cyan-200">{selectedPkg.name}</span>.
              </p>
            </GlassCard>

            <GlassCard className="p-6">
              <p className="label mb-4">03 · Konfirmasi</p>
              <ol className="space-y-2.5 text-sm text-slate-300">
                <li><span className="mr-2 font-mono text-cyan-400">1</span> Sudah transfer? Tekan tombol di bawah.</li>
                <li><span className="mr-2 font-mono text-cyan-400">2</span> Chat admin via WhatsApp, kirim bukti transfer.</li>
                <li><span className="mr-2 font-mono text-cyan-400">3</span> Admin verifikasi → beri kode token → masukkan untuk aktif.</li>
              </ol>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button onClick={handleClaim} disabled={busy} className="btn-neon mt-5 w-full justify-center">
                {busy ? 'Mengirim…' : 'Saya sudah bayar'} <ArrowRight size={16} />
              </button>
              <a
                href={waLink(`Halo admin Discoleous, saya ingin bayar paket ${selectedPkg.name} (${formatIDR(selectedPkg.price)}).`)}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost mt-3 w-full justify-center"
              >
                <MessageCircle size={15} /> Tanya admin dulu ({ADMIN_WA_DISPLAY})
              </a>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  )
}
