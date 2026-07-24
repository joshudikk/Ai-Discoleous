import { Check, Lock, Star } from 'lucide-react'
import GlassCard from './GlassCard'
import { formatIDR } from '../lib/packages'

const ACCENT = {
  cyan: {
    ring: 'hover:border-cyan-400/70 hover:shadow-[0_0_25px_rgba(0,242,254,0.5)]',
    text: 'text-cyan-neon',
    level: 'text-cyan-200/70',
    selected: 'border-cyan-400 shadow-[0_0_30px_rgba(0,242,254,0.5)]',
  },
  violet: {
    ring: 'hover:border-glow/70 hover:shadow-[0_0_25px_rgba(121,40,202,0.55)]',
    text: 'text-[#b57cff]',
    level: 'text-[#c9a3ff]/70',
    selected: 'border-glow shadow-[0_0_30px_rgba(121,40,202,0.55)]',
  },
  lime: {
    ring: 'hover:border-lime-cyber/70 hover:shadow-[0_0_25px_rgba(0,255,135,0.5)]',
    text: 'text-lime-cyber',
    level: 'text-lime-cyber/70',
    selected: 'border-lime-cyber shadow-[0_0_30px_rgba(0,255,135,0.5)]',
  },
}

export default function PackageCard({ pkg, selected = false, onSelect, compact = false }) {
  const a = ACCENT[pkg.accent] ?? ACCENT.cyan

  return (
    <GlassCard
      interactive
      onClick={() => onSelect?.(pkg.id)}
      className={`cursor-pointer p-6 ${a.ring} ${selected ? a.selected : ''}`}
    >
      {pkg.badge && (
        <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full
                        border border-lime-cyber/60 bg-void px-3 py-1
                        font-mono text-[10px] uppercase tracking-[0.15em] text-lime-cyber
                        shadow-[0_0_20px_rgba(0,255,135,0.45)]">
          <Star size={11} className="fill-lime-cyber" />
          {pkg.badge}
        </div>
      )}

      <p className={`font-mono text-[11px] uppercase tracking-[0.2em] ${a.level}`}>{pkg.level}</p>
      <h3 className={`mt-1 font-display text-2xl font-bold ${a.text}`}>{pkg.name}</h3>
      <p className="mt-1 text-xs text-slate-400">{pkg.tagline}</p>

      <div className="my-5 flex items-baseline gap-1">
        <span className="font-display text-3xl font-bold text-white">{formatIDR(pkg.price)}</span>
        <span className="font-mono text-xs text-slate-500">/bulan</span>
      </div>

      {!compact && (
        <ul className="space-y-2.5 text-sm">
          {pkg.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-slate-300">
              <Check size={15} className={`mt-0.5 shrink-0 ${a.text}`} />
              <span>{f}</span>
            </li>
          ))}
          {pkg.locked.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-slate-600 line-through">
              <Lock size={14} className="mt-0.5 shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <p className={`mt-4 text-center font-mono text-[11px] uppercase tracking-[0.2em] ${a.text}`}>
          ✦ Paket dipilih
        </p>
      )}
    </GlassCard>
  )
}
