import { motion } from 'framer-motion'

/**
 * Indikator proses AI.
 * Menampilkan tiga hal sekaligus: tahap yang sedang berjalan, persentase,
 * dan jumlah kata yang sudah masuk — jadi pengguna tahu prosesnya benar-benar jalan.
 */
export default function CyberLoader({ percent = 0, stage = 'Menyiapkan', words = 0 }) {
  const p = Math.min(100, Math.max(0, Math.round(percent)))

  return (
    <div className="rounded-xl border border-cyan-500/25 bg-slate-950/60 p-5">
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em]">
        <span className="text-cyan-300">{stage}</span>
        <span className="text-lime-cyber neon-text-lime">{p}%</span>
      </div>

      {/* Bilah kemajuan dengan kilau berjalan */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-neon via-electric to-lime-cyber
                     shadow-[0_0_18px_rgba(0,242,254,0.7)]"
          animate={{ width: `${p}%` }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
        />
      </div>

      {/* Deret pulsa: gerak vertikal seperti sinyal data */}
      <div className="mt-4 flex items-end gap-1" aria-hidden="true">
        {Array.from({ length: 28 }).map((_, i) => (
          <motion.span
            key={i}
            className="w-1 rounded-sm bg-cyan-neon/70"
            animate={{ height: [4, 4 + ((i * 7) % 22), 4] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.045, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <p className="mt-4 font-mono text-[11px] text-slate-400">
        {words.toLocaleString('id-ID')} kata diterima · jangan tutup halaman ini
      </p>
    </div>
  )
}
