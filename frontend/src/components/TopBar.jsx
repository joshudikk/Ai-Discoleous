import { Link, useNavigate } from 'react-router-dom'
import { LogOut, LayoutDashboard, Shield, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getPackage } from '../lib/packages'

export default function TopBar() {
  const { profile, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const pkg = getPackage(profile?.packageTier)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-500/15 bg-void/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link to="/dashboard" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/40
                           bg-cyan-neon/10 text-cyan-neon shadow-neon-sm transition group-hover:shadow-neon">
            <Sparkles size={17} />
          </span>
          <span className="font-display text-lg font-bold tracking-wide text-white">
            Disco<span className="text-cyan-neon neon-text">leous</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full border border-cyan-500/30 px-3 py-1.5
                           font-mono text-[11px] uppercase tracking-[0.15em] text-cyan-200 sm:inline-block">
            {pkg.name}
          </span>
          {isAdmin && (
            <Link to="/admin" className="btn-ghost" title="Panel admin">
              <Shield size={14} /> <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          <Link to="/dashboard" className="btn-ghost">
            <LayoutDashboard size={14} /> <span className="hidden sm:inline">Dasbor</span>
          </Link>
          <button onClick={handleLogout} className="btn-ghost" title="Keluar">
            <LogOut size={14} /> <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  )
}
