import { motion } from 'framer-motion'

/**
 * Kartu kaca dasar. `interactive` menambah pendaran dan angkat halus saat hover.
 * Sudut kiri-atas dan kanan-bawah diberi siku neon sebagai penanda khas aplikasi.
 */
export default function GlassCard({ children, className = '', interactive = false, corners = true, ...rest }) {
  return (
    <motion.div
      className={`relative rounded-2xl bg-slate-900/40 backdrop-blur-md border border-cyan-500/20
                  shadow-[0_0_15px_rgba(0,242,254,0.1)]
                  ${interactive ? 'transition-all duration-300 hover:border-cyan-400/60 hover:shadow-[0_0_25px_rgba(0,242,254,0.5)]' : ''}
                  ${className}`}
      whileHover={interactive ? { y: -6, scale: 1.015 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      {...rest}
    >
      {corners && (
        <>
          <span className="pointer-events-none absolute -left-px -top-px h-5 w-5 rounded-tl-2xl border-l-2 border-t-2 border-cyan-neon/70" />
          <span className="pointer-events-none absolute -bottom-px -right-px h-5 w-5 rounded-br-2xl border-b-2 border-r-2 border-cyan-neon/70" />
        </>
      )}
      {children}
    </motion.div>
  )
}
