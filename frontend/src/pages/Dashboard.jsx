import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, FileText, FlaskConical, ArrowUpRight, Clock } from 'lucide-react'
import { listDocs } from '../lib/localDocs'
import { useAuth } from '../context/AuthContext'
import { getPackage } from '../lib/packages'
import GlassCard from '../components/GlassCard'

const DOC_TYPES = [
  {
    id: 'makalah',
    name: 'Makalah',
    icon: FileText,
    desc: 'Pendahuluan, pembahasan, penutup. Untuk tugas mata kuliah.',
    hint: '1.500–3.000 kata',
    accent: 'from-cyan-neon/20 to-transparent',
    ring: 'group-hover:border-cyan-400/70 group-hover:shadow-[0_0_28px_rgba(0,242,254,0.45)]',
    text: 'text-cyan-neon',
    hoverText: 'group-hover:text-cyan-neon',
  },
  {
    id: 'esai',
    name: 'Esai',
    icon: BookOpen,
    desc: 'Satu argumen yang dibangun dari awal sampai simpulan.',
    hint: '700–1.500 kata',
    accent: 'from-glow/25 to-transparent',
    ring: 'group-hover:border-glow/70 group-hover:shadow-[0_0_28px_rgba(121,40,202,0.5)]',
    text: 'text-[#b57cff]',
    hoverText: 'group-hover:text-[#b57cff]',
  },
  {
    id: 'kti',
    name: 'Karya Tulis Ilmiah',
    icon: FlaskConical,
    desc: 'BAB I–V lengkap dengan metode dan daftar pustaka.',
    hint: '3.000+ kata',
    accent: 'from-lime-cyber/20 to-transparent',
    ring: 'group-hover:border-lime-cyber/70 group-hover:shadow-[0_0_28px_rgba(0,255,135,0.45)]',
    text: 'text-lime-cyber',
    hoverText: 'group-hover:text-lime-cyber',
  },
]

const STATUS_BANNER = {
  inactive: 'Langganan belum aktif. Selesaikan pembayaran agar generator bisa dipakai.',
  pending: 'Pembayaran menunggu verifikasi admin. Setelah diverifikasi, masukkan kode token untuk mengaktifkan.',
  verified: 'Pembayaran sudah diverifikasi. Masukkan kode token dari admin untuk mengaktifkan langganan.',
  rejected: 'Pengajuan pembayaranmu ditolak admin. Hubungi admin lewat WhatsApp, lalu ajukan ulang.',
}

export default function Dashboard() {
  const { user, profile, isActive, status } = useAuth()
  const [docs, setDocs] = useState([])
  const pkg = getPackage(profile?.packageTier)

  // Riwayat dokumen dibaca dari perangkat pengguna (localStorage), bukan server.
  useEffect(() => {
    if (!user) return
    setDocs(listDocs(user.uid).slice(0, 6))
  }, [user])

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {/* Sapaan + status langganan */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-300/70">Ruang kerja</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
          Halo, <span className="neon-text text-cyan-neon">{profile?.nama?.split(' ')[0] ?? 'penulis'}</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">Pilih jenis dokumen untuk membuka jendela generator.</p>
      </motion.div>

      {!isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40
                     bg-amber-500/10 px-5 py-3.5"
        >
          <p className="text-sm text-amber-200">
            {STATUS_BANNER[status] ?? STATUS_BANNER.inactive}
          </p>
          <Link to="/paket" className="btn-ghost border-amber-400/50 text-amber-200 hover:border-amber-300">
            {status === 'inactive' ? 'Lihat cara aktivasi' : 'Masukkan token'} <ArrowUpRight size={14} />
          </Link>
        </motion.div>
      )}

      {/* Pilihan jenis dokumen */}
      <div className="mt-9 grid gap-6 md:grid-cols-3">
        {DOC_TYPES.map((t, i) => {
          const Icon = t.icon
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07 * i, duration: 0.45 }}
            >
              <Link to={`/generator/${t.id}`} className="group block">
                <div
                  className={`relative h-full overflow-hidden rounded-2xl border border-cyan-500/20
                              bg-slate-900/40 p-7 backdrop-blur-md shadow-[0_0_15px_rgba(0,242,254,0.1)]
                              transition-all duration-300 group-hover:-translate-y-1.5 ${t.ring}`}
                >
                  <div className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${t.accent} opacity-60`} />

                  <div className="relative">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-void/60">
                      <Icon size={22} className={t.text} />
                    </span>
                    <h2 className={`mt-5 font-display text-xl font-bold text-white transition ${t.hoverText}`}>
                      {t.name}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.desc}</p>

                    <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-slate-500">{t.hint}</span>
                      <span className={`flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.15em] ${t.text}`}>
                        Buka <ArrowUpRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* Ringkasan paket + riwayat */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <GlassCard className="p-6">
          <p className="label">Paket aktif</p>
          <h3 className="mt-1 font-display text-2xl font-bold text-white">{pkg.name}</h3>
          <p className="mt-1 text-xs text-slate-400">{pkg.level}</p>

          <dl className="mt-5 space-y-3 font-mono text-[12px]">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <dt className="text-slate-500">Saran judul</dt>
              <dd className={pkg.id === 'faozonica' ? 'text-slate-600' : 'text-lime-cyber'}>
                {pkg.id === 'faozonica' ? 'terkunci' : 'tersedia'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd className={isActive ? 'text-lime-cyber' : 'text-amber-300'}>
                {isActive ? 'aktif' : 'belum aktif'}
              </dd>
            </div>
          </dl>

          {pkg.id !== 'dikthought' && (
            <Link to="/paket" className="btn-ghost mt-6 w-full justify-center">
              Naikkan paket <ArrowUpRight size={14} />
            </Link>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <p className="label mb-0">Dokumen terakhir</p>
            <Clock size={14} className="text-slate-600" />
          </div>

          {docs.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-400">Belum ada dokumen tersimpan.</p>
              <p className="mt-1 text-xs text-slate-600">
                Dokumen tersimpan di perangkat ini saja, tidak diunggah ke server.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-white/5">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-200">{d.title}</p>
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
                      {d.type} · {d.createdAt ? new Date(d.createdAt).toLocaleDateString('id-ID') : 'baru saja'}
                    </p>
                  </div>
                  <Link
                    to={`/generator/${d.type}?doc=${d.id}`}
                    className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-300 transition hover:text-cyan-neon"
                  >
                    Buka
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
