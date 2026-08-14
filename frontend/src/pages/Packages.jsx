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
import { claimPayment, redeemToken, checkPromo } from '../lib/api'
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

  // Promo/diskon
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState(null) // { code, discountPercent }
  const [promoBusy, setPromoBusy] = useState(false)
  const [promoError, setPromoError] = useState('')

  const selectedPkg = getPackage(selected)
  const currentPkg = getPackage(profile?.packageTier)

  const discount = promo?.discountPercent ?? 0
  const finalPrice = Math.round((selectedPkg.price * (100 - discount)) / 100)

  async function applyPromo() {
    const code = promoInput.trim()
    if (!code) return
    setPromoError('')
    setPromoBusy(true)
    try {
      const p = await checkPromo(code)
      setPromo(p)
    } catch (e) {
      setPromo(null)
      setPromoError(e.message)
    } finally {
      setPromoBusy(false)
    }
  }

  function clearPromo() {
    setPromo(null)
    setPromoInput('')
    setPromoError('')
  }

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
      await claimPayment(selected, promo?.code ?? '')
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
          {status === 'rejected' && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-500/45 bg-rose-500/10 px-4 py-3.5">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-300" />
              <div>
                <p className="text-sm text-rose-100">
                  Pengajuan pembayaranmu <span className="text-rose-300">ditolak admin</span> — biasanya karena bukti
                  transfer belum diterima atau tidak cocok.
                </p>
                <a
                  href={waLink('Halo admin Discoleous, pengajuan pembayaran saya ditolak. Mohon dibantu ya.')}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost mt-3 border-rose-400/50 text-rose-200 hover:border-rose-300"
                >
                  <MessageCircle size={14} /> Hubungi admin ({ADMIN_WA_DISPLAY})
                </a>
              </div>
            </div>
          )}

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
              {/* Kode promo */}
              <div className="mt-4">
                <span className="label">Kode promo (opsional)</span>
                {promo ? (
                  <div className="flex items-center justify-between rounded-lg border border-lime-cyber/40 bg-lime-cyber/10 px-3.5 py-2.5">
                    <span className="font-mono text-[12px] text-lime-cyber">
                      {promo.code} · diskon {promo.discountPercent}%
                    </span>
                    <button onClick={clearPromo} className="font-mono text-[11px] text-slate-400 transition hover:text-rose-300">
                      Hapus
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                      placeholder="mis. DISKON20"
                      className="field flex-1 font-mono uppercase"
                    />
                    <button onClick={applyPromo} disabled={promoBusy || !promoInput.trim()} className="btn-ghost shrink-0">
                      {promoBusy ? '…' : 'Terapkan'}
                    </button>
                  </div>
                )}
                {promoError && <p className="mt-1.5 text-xs text-rose-300">{promoError}</p>}
              </div>

              {/* Nominal (ikut diskon bila ada) */}
              <div className="mt-4 rounded-lg border border-cyan-500/15 bg-void/40 px-3.5 py-3">
                <p className="font-mono text-[11px] text-slate-500">
                  Yang ditransfer untuk paket <span className="text-cyan-200">{selectedPkg.name}</span>:
                </p>
                {discount > 0 ? (
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono text-sm text-slate-500 line-through">{formatIDR(selectedPkg.price)}</span>
                    <span className="font-display text-xl font-bold text-lime-cyber">{formatIDR(finalPrice)}</span>
                    <span className="font-mono text-[11px] text-lime-cyber">hemat {discount}%</span>
                  </p>
                ) : (
                  <p className="mt-1 font-display text-xl font-bold text-cyan-200">{formatIDR(selectedPkg.price)}</p>
                )}
              </div>
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
                href={waLink(
                  discount > 0
                    ? `Halo admin Discoleous, saya bayar paket ${selectedPkg.name} pakai promo ${promo.code} (${formatIDR(finalPrice)}, diskon ${discount}%).`
                    : `Halo admin Discoleous, saya ingin bayar paket ${selectedPkg.name} (${formatIDR(selectedPkg.price)}).`,
                )}
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
