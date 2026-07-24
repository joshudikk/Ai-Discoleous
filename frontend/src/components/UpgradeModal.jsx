import { AnimatePresence, motion } from 'framer-motion'
import { Lock, ArrowUpRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Modal yang muncul saat pengguna paket rendah menyentuh fitur terkunci.
 * Nada tulisan: jelaskan apa yang terjadi dan apa langkah berikutnya, tanpa minta maaf.
 */
export default function UpgradeModal({ open, onClose, title, message }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-title"
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-glow/50
                       bg-slate-900/80 p-8 text-center backdrop-blur-xl
                       shadow-[0_0_45px_rgba(121,40,202,0.55)]"
          >
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="absolute right-4 top-4 rounded-md p-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full
                            border border-glow/60 bg-glow/10 shadow-violet animate-pulse-glow">
              <Lock className="text-glow" size={26} />
            </div>

            <h3 id="upgrade-title" className="font-display text-xl font-bold text-white neon-text">
              {title ?? 'Akses Ditolak'}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {message ??
                'Fitur Saran Judul hanya tersedia untuk paket Medium (Sharnikas) atau Tinggi (Dikthought). Silakan Upgrade Paket Anda!'}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/paket" className="btn-neon flex-1">
                Upgrade paket <ArrowUpRight size={16} />
              </Link>
              <button onClick={onClose} className="btn-ghost flex-1 justify-center">
                Tulis judul sendiri
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
