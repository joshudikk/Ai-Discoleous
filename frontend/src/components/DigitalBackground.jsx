import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

/**
 * DigitalBackground
 * Lapisan atmosfer di belakang seluruh aplikasi. Tiga lapis, dari belakang ke depan:
 *   1. Grid perspektif statis (CSS)      -> memberi kedalaman
 *   2. Mesh partikel di canvas (JS)      -> "jaringan" yang bereaksi ke kursor
 *   3. Orb ambient (Framer Motion)       -> pendaran warna yang bergerak lambat
 *
 * Canvas berhenti sendiri saat tab tidak aktif dan saat pengguna memilih
 * "kurangi animasi" di sistem operasinya.
 */
export default function DigitalBackground({ density = 'normal' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pointer = { x: -9999, y: -9999 }
    let particles = []
    let raf = null
    let running = true

    const COUNT = density === 'low' ? 34 : density === 'high' ? 110 : 70
    const LINK_DIST = 130
    const POINTER_DIST = 170

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    function seed() {
      const w = window.innerWidth
      const h = window.innerHeight
      // Kepadatan menyesuaikan luas layar supaya di ponsel tidak berat
      const count = Math.round(COUNT * Math.min(1, (w * h) / (1440 * 900)))
      particles = Array.from({ length: Math.max(18, count) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.6 + 0.6,
      }))
    }

    function draw() {
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < -20) p.x = w + 20
        if (p.x > w + 20) p.x = -20
        if (p.y < -20) p.y = h + 20
        if (p.y > h + 20) p.y = -20
      }

      // Garis penghubung antar simpul
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.22
            ctx.strokeStyle = `rgba(0, 242, 254, ${alpha})`
            ctx.lineWidth = 0.6
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }

        // Tautan ke kursor: jaringan terasa merespons pengguna
        const pdx = a.x - pointer.x
        const pdy = a.y - pointer.y
        const pdist = Math.hypot(pdx, pdy)
        if (pdist < POINTER_DIST) {
          const alpha = (1 - pdist / POINTER_DIST) * 0.5
          ctx.strokeStyle = `rgba(121, 40, 202, ${alpha})`
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(pointer.x, pointer.y)
          ctx.stroke()
        }

        ctx.fillStyle = pdist < POINTER_DIST ? 'rgba(0, 255, 135, 0.85)' : 'rgba(79, 172, 254, 0.7)'
        ctx.beginPath()
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2)
        ctx.fill()
      }

      if (running) raf = requestAnimationFrame(draw)
    }

    function onPointerMove(e) {
      pointer.x = e.clientX
      pointer.y = e.clientY
    }
    function onPointerLeave() {
      pointer.x = -9999
      pointer.y = -9999
    }
    function onVisibility() {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!reduceMotion) {
        running = true
        raf = requestAnimationFrame(draw)
      }
    }

    resize()
    if (reduceMotion) {
      draw()          // satu frame statis saja
      running = false
      cancelAnimationFrame(raf)
    } else {
      raf = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [density])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Lapis 1 — grid perspektif */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,242,254,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(0,242,254,0.35) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 75%)',
        }}
      />

      {/* Lapis 2 — mesh partikel */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Lapis 3 — orb ambient */}
      <motion.div
        className="absolute -left-40 top-[-10%] h-[38rem] w-[38rem] rounded-full bg-glow/25 blur-[130px]"
        animate={{ x: [0, 60, -20, 0], y: [0, 40, 80, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-40 bottom-[-15%] h-[34rem] w-[34rem] rounded-full bg-cyan-neon/20 blur-[130px]"
        animate={{ x: [0, -50, 20, 0], y: [0, -60, -20, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Garis pindai tipis dari atas ke bawah */}
      <div className="absolute inset-x-0 top-0 h-px animate-scan bg-gradient-to-r from-transparent via-cyan-neon/60 to-transparent" />

      {/* Vignette supaya teks tetap terbaca */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(11,15,25,0.85)_100%)]" />
    </div>
  )
}
