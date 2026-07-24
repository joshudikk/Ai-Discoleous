import { motion } from 'framer-motion'

/** Layar tunggu saat sesi pengguna sedang diperiksa. */
export default function BootScreen({ text = 'Menyiapkan ruang kerja' }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <motion.div
          className="mx-auto h-16 w-16 rounded-xl border border-cyan-500/40 shadow-neon"
          animate={{ rotate: [0, 90, 180, 270, 360], borderRadius: ['12px', '50%', '12px'] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.3em] text-cyan-300/70">{text}</p>
      </div>
    </div>
  )
}
