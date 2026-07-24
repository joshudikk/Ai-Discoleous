import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Wallet, ShieldCheck, Search, Clock, KeyRound, Copy, Check, BadgeCheck, Sparkles } from 'lucide-react'
import { fetchAdminUsers, fetchAdminPayments, verifyPayment, grantClaude } from '../lib/api'
import { formatIDR, getPackage } from '../lib/packages'
import GlassCard from '../components/GlassCard'

const TIER_COLOR = {
  faozonica: 'border-cyan-500/40 text-cyan-200',
  sharnikas: 'border-glow/50 text-[#c9a3ff]',
  dikthought: 'border-lime-cyber/50 text-lime-cyber',
}

const STATUS_META = {
  active: { label: 'aktif', tone: 'text-lime-cyber', dot: 'bg-lime-cyber shadow-lime' },
  verified: { label: 'token terbit', tone: 'text-cyan-200', dot: 'bg-cyan-neon' },
  pending: { label: 'menunggu', tone: 'text-amber-300', dot: 'bg-amber-400' },
  inactive: { label: 'belum aktif', tone: 'text-amber-300', dot: 'bg-amber-400' },
}

function PaymentsPanel() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyUid, setBusyUid] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    fetchAdminPayments()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleVerify(uid) {
    setError('')
    setBusyUid(uid)
    try {
      const { token } = await verifyPayment(uid)
      setItems((list) => list.map((it) => (it.uid === uid ? { ...it, status: 'verified', token } : it)))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyUid('')
    }
  }

  const copy = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      /* abaikan */
    }
  }

  return (
    <GlassCard className="mt-8 p-6">
      <div className="flex items-center gap-2.5">
        <KeyRound size={16} className="text-cyan-neon" />
        <p className="label mb-0">Pembayaran menunggu verifikasi</p>
        {items.length > 0 && (
          <span className="rounded-full border border-amber-400/40 px-2 py-0.5 font-mono text-[10px] text-amber-300">
            {items.filter((i) => i.status === 'pending').length} baru
          </span>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

      {loading ? (
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-slate-500">Memuat…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Tidak ada pembayaran yang menunggu.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((it) => {
            const pkg = getPackage(it.packageTier)
            return (
              <div
                key={it.uid}
                className="flex flex-col gap-3 rounded-xl border border-cyan-500/20 bg-void/40 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-200">{it.nama || '(tanpa nama)'}</p>
                  <p className="truncate font-mono text-[12px] text-slate-400">{it.email}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-300/70">
                    {pkg.name} · {formatIDR(pkg.price)}
                  </p>
                </div>

                {it.status === 'pending' ? (
                  <button
                    onClick={() => handleVerify(it.uid)}
                    disabled={busyUid === it.uid}
                    className="btn-neon shrink-0 justify-center"
                  >
                    <BadgeCheck size={15} /> {busyUid === it.uid ? 'Memproses…' : 'Verifikasi'}
                  </button>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-lime-cyber/80">Kode token</p>
                      <p className="font-mono text-lg font-bold tracking-[0.25em] text-lime-cyber">{it.token}</p>
                    </div>
                    <button onClick={() => copy(it.token, it.uid)} className="btn-ghost shrink-0" title="Salin token">
                      {copied === it.uid ? <Check size={14} className="text-lime-cyber" /> : <Copy size={14} />}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          <p className="flex items-center gap-1.5 pt-1 font-mono text-[11px] text-slate-500">
            <Clock size={12} /> Berikan kode token ke pengguna lewat WhatsApp setelah memverifikasi bukti bayar.
          </p>
        </div>
      )}
    </GlassCard>
  )
}

export default function AdminDashboard() {
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyUid, setBusyUid] = useState('')
  const [rowTokens, setRowTokens] = useState({})
  const [copied, setCopied] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [claudeBusy, setClaudeBusy] = useState('')
  const [claudeCredits, setClaudeCredits] = useState({})

  useEffect(() => {
    fetchAdminUsers()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function verifyUser(uid) {
    setVerifyError('')
    setBusyUid(uid)
    try {
      const { token } = await verifyPayment(uid)
      setRowTokens((t) => ({ ...t, [uid]: token }))
      setRows((list) => list.map((r) => (r.uid === uid ? { ...r, statusSubscription: 'verified' } : r)))
    } catch (e) {
      setVerifyError(e.message)
    } finally {
      setBusyUid('')
    }
  }

  const copyText = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      /* abaikan */
    }
  }

  async function grantClaudeCredit(uid) {
    setVerifyError('')
    setClaudeBusy(uid)
    try {
      const { extraCredits } = await grantClaude(uid, 1)
      setClaudeCredits((c) => ({ ...c, [uid]: extraCredits }))
    } catch (e) {
      setVerifyError(e.message)
    } finally {
      setClaudeBusy('')
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => `${r.nama} ${r.email}`.toLowerCase().includes(s))
  }, [rows, q])

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.statusSubscription === 'active')
    const mrr = active.reduce((sum, r) => sum + getPackage(r.packageTier).price, 0)
    return { total: rows.length, active: active.length, mrr }
  }, [rows])

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-300/70">Panel admin</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white neon-text">Pengguna & langganan</h1>

      {/* Tiga angka yang paling sering dicari admin */}
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {[
          { label: 'Total pengguna', value: stats.total.toLocaleString('id-ID'), icon: Users, tone: 'text-cyan-neon' },
          { label: 'Langganan aktif', value: stats.active.toLocaleString('id-ID'), icon: ShieldCheck, tone: 'text-lime-cyber' },
          { label: 'Pendapatan bulanan', value: formatIDR(stats.mrr), icon: Wallet, tone: 'text-[#b57cff]' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <GlassCard className="p-6">
                <div className="flex items-start justify-between">
                  <p className="label mb-0">{s.label}</p>
                  <Icon size={17} className={s.tone} />
                </div>
                <p className={`mt-3 font-display text-3xl font-bold ${s.tone}`}>{s.value}</p>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>

      <PaymentsPanel />

      <GlassCard className="mt-7 overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-cyan-500/15 px-5 py-3.5">
          <Search size={15} className="text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama atau email"
            className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
          />
        </div>

        {verifyError && (
          <p className="border-b border-rose-500/20 bg-rose-500/10 px-5 py-2.5 text-xs text-rose-200">{verifyError}</p>
        )}

        {loading ? (
          <p className="px-5 py-10 text-center font-mono text-xs uppercase tracking-[0.2em] text-slate-500">Memuat data…</p>
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-rose-300">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Tidak ada pengguna yang cocok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Paket</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Tagihan/bulan</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const pkg = getPackage(r.packageTier)
                  const aktif = r.statusSubscription === 'active'
                  const meta = STATUS_META[r.statusSubscription] ?? STATUS_META.inactive
                  return (
                    <tr key={r.uid} className="border-b border-white/5 transition hover:bg-cyan-500/5">
                      <td className="px-5 py-3.5 text-slate-200">
                        {r.nama}
                        {r.role === 'admin' && (
                          <span className="ml-2 rounded border border-amber-400/40 px-1.5 py-0.5 font-mono text-[9px] uppercase text-amber-300">
                            admin
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[12px] text-slate-400">{r.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${TIER_COLOR[r.packageTier] ?? TIER_COLOR.faozonica}`}>
                          {pkg.name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${meta.tone}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-[12px] text-slate-300">
                        {formatIDR(pkg.price)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {aktif ? (
                          r.packageTier === 'sharnikas' || r.packageTier === 'dikthought' ? (
                            <div className="inline-flex items-center gap-2">
                              {claudeCredits[r.uid] != null && (
                                <span className="font-mono text-[10px] text-[#c9a3ff]">+{claudeCredits[r.uid]} kredit</span>
                              )}
                              <button
                                onClick={() => grantClaudeCredit(r.uid)}
                                disabled={claudeBusy === r.uid}
                                className="btn-ghost border-glow/40 text-[#c9a3ff] hover:border-glow"
                                title="Tambah 1 kredit Athena Mode (setelah bayar Rp15.000)"
                              >
                                <Sparkles size={13} /> {claudeBusy === r.uid ? '…' : '+Athena'}
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono text-[11px] text-slate-600">—</span>
                          )
                        ) : rowTokens[r.uid] ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="font-mono text-sm font-bold tracking-[0.2em] text-lime-cyber">
                              {rowTokens[r.uid]}
                            </span>
                            <button onClick={() => copyText(rowTokens[r.uid], r.uid)} className="btn-ghost" title="Salin token">
                              {copied === r.uid ? <Check size={13} className="text-lime-cyber" /> : <Copy size={13} />}
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => verifyUser(r.uid)} disabled={busyUid === r.uid} className="btn-neon">
                            <BadgeCheck size={14} /> {busyUid === r.uid ? '…' : 'Verifikasi'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
