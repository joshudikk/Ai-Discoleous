import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, ArrowLeft, Check, Copy, Download, Lightbulb, Lock, Play, Save, Square,
  Sparkles, MessageCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getDoc as getLocalDoc, saveDoc as saveLocalDoc } from '../lib/localDocs'
import { fetchAthenaUsage, fetchUsage, generateDocument, suggestTitles } from '../lib/api'
import { canSuggestTitles, getPackage } from '../lib/packages'
import { waLink, ADMIN_WA_DISPLAY } from '../lib/payment'
import { downloadDocx } from '../lib/exportDocx'
import GlassCard from '../components/GlassCard'
import UpgradeModal from '../components/UpgradeModal'
import CyberLoader from '../components/CyberLoader'

const DOC_LABEL = {
  makalah: { name: 'Makalah', target: 2200 },
  esai: { name: 'Esai', target: 1100 },
  kti: { name: 'Karya Tulis Ilmiah', target: 3800 },
}

const JURUSAN = [
  'Pendidikan', 'Hukum', 'Ekonomi & Bisnis', 'Teknik Informatika', 'Kedokteran & Kesehatan',
  'Psikologi', 'Ilmu Komunikasi', 'Pertanian', 'Sastra & Bahasa', 'Ilmu Politik',
  'Teknik Sipil', 'Manajemen',
]

const PANJANG = [
  { id: 'ringkas', label: 'Ringkas' },
  { id: 'standar', label: 'Standar' },
  { id: 'lengkap', label: 'Lengkap' },
]

const METODE_BASE = [
  { id: 'kualitatif', label: 'Kualitatif' },
  { id: 'kuantitatif', label: 'Kuantitatif' },
  { id: 'campuran', label: 'Campuran' },
]

const PUSTAKA = [
  { id: '5', label: '5 tahun' },
  { id: '10', label: '10 tahun' },
  { id: 'bebas', label: 'Bebas' },
]

// Kelas tombol segmen (dipakai bersama untuk panjang, metode, dan pustaka).
const segCls = (active) =>
  `rounded-lg border px-2 py-2 font-mono text-[11px] uppercase tracking-[0.1em] transition-all duration-200 ${
    active
      ? 'border-cyan-400 bg-cyan-neon/10 text-cyan-neon shadow-[0_0_18px_rgba(0,242,254,0.35)]'
      : 'border-white/10 text-slate-500 hover:border-cyan-500/40 hover:text-slate-300'
  }`

// ── Konversi Markdown → HTML untuk dokumen Word ────────────────────────────────
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Simbol LaTeX → Unicode. Urutan penting: kunci yang lebih panjang lebih dulu
// (mis. \leq sebelum \le) supaya tidak terpotong separuh.
const MATH_SYMBOLS = {
  '\\times': '×', '\\div': '÷', '\\pm': '±', '\\mp': '∓', '\\cdot': '·',
  '\\leq': '≤', '\\le': '≤', '\\geq': '≥', '\\ge': '≥', '\\neq': '≠', '\\ne': '≠',
  '\\approx': '≈', '\\equiv': '≡', '\\propto': '∝', '\\infty': '∞',
  '\\sum': 'Σ', '\\prod': 'Π', '\\int': '∫', '\\partial': '∂', '\\nabla': '∇',
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
  '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\kappa': 'κ', '\\lambda': 'λ',
  '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ', '\\sigma': 'σ',
  '\\tau': 'τ', '\\phi': 'φ', '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
  '\\Delta': 'Δ', '\\Sigma': 'Σ', '\\Omega': 'Ω', '\\Phi': 'Φ', '\\Lambda': 'Λ',
  '\\Rightarrow': '⇒', '\\rightarrow': '→', '\\leftarrow': '←', '\\to': '→',
  '\\ldots': '…', '\\dots': '…', '\\bar': '‾', '\\%': '%',
}
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', n: 'ⁿ', i: 'ⁱ' }
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋', i: 'ᵢ', j: 'ⱼ', n: 'ₙ', a: 'ₐ', x: 'ₓ', t: 'ₜ' }

// Ubah deret karakter jadi superscript/subscript Unicode; null kalau ada yang tak punya padanan.
function unicodeRun(s, map) {
  let out = ''
  for (const ch of s) {
    if (!map[ch]) return null
    out += map[ch]
  }
  return out
}

/** Ubah notasi LaTeX jadi teks Unicode yang rapi saat dibuka di Word. */
function mathToText(src) {
  let t = src
  t = t.replace(/\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
  t = t.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)')
  t = t.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, '$1')
  for (const [k, v] of Object.entries(MATH_SYMBOLS)) t = t.split(k).join(v)
  t = t.replace(/\^\{([^{}]+)\}|\^(\w)/g, (_, a, b) => {
    const raw = a ?? b
    return unicodeRun(raw, SUP) ?? `^${raw}`
  })
  t = t.replace(/_\{([^{}]+)\}|_(\w)/g, (_, a, b) => {
    const raw = a ?? b
    return unicodeRun(raw, SUB) ?? `_${raw}`
  })
  t = t.replace(/\\left|\\right|\\!|\\,|\\;/g, '')
  t = t.replace(/\\[a-zA-Z]+/g, '') // perintah LaTeX sisa yang tak dikenal
  return t.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim()
}

function inlineMd(s) {
  let t = escapeHtml(s)
  t = t.replace(/\$([^$]+)\$/g, (_, m) => mathToText(m)) // rumus inline $...$
  t = t.replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => mathToText(m)) // rumus inline \(...\)
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>')
  t = t.replace(/`([^`]+)`/g, '<span style="font-family:\'Courier New\',monospace">$1</span>')
  return t
}

function mdToHtml(md) {
  const lines = md.split(/\r?\n/)
  let html = ''
  let list = null // 'ul' | 'ol'
  const closeList = () => {
    if (list) {
      html += `</${list}>`
      list = null
    }
  }
  const isRow = (l) => /^\s*\|.*\|\s*$/.test(l)
  const isSep = (l) => /^\s*\|[\s:|-]+\|\s*$/.test(l) && l.includes('-')
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd()
    if (!line.trim()) {
      closeList()
      continue
    }

    // Blok kode ```
    if (/^\s*```/.test(line)) {
      closeList()
      const buf = []
      i++
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++])
      html += `<pre>${escapeHtml(buf.join('\n'))}</pre>`
      continue
    }

    // Rumus blok $$ ... $$ → paragraf tersendiri, rata tengah
    if (/^\s*\$\$/.test(line)) {
      closeList()
      let body = line.replace(/^\s*\$\$/, '')
      if (body.trim().endsWith('$$')) {
        body = body.trim().replace(/\$\$$/, '')
      } else {
        i++
        while (i < lines.length && !lines[i].includes('$$')) body += ' ' + lines[i++]
        if (i < lines.length) body += ' ' + lines[i].replace(/\$\$.*$/, '')
      }
      html += `<p class="rumus">${mathToText(escapeHtml(body))}</p>`
      continue
    }

    // Tabel Markdown → tabel Word sungguhan (bergaris)
    if (isRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      closeList()
      const head = cells(line)
      i += 2
      const rows = []
      while (i < lines.length && isRow(lines[i])) rows.push(cells(lines[i++]))
      i-- // kembalikan satu langkah; for-loop akan menaikkannya lagi
      html += '<table><thead><tr>'
      html += head.map((h) => `<th>${inlineMd(h)}</th>`).join('')
      html += '</tr></thead><tbody>'
      for (const r of rows) html += '<tr>' + r.map((c) => `<td>${inlineMd(c)}</td>`).join('') + '</tr>'
      html += '</tbody></table>'
      continue
    }

    // Garis pemisah
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      closeList()
      html += '<hr>'
      continue
    }

    let m
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      closeList()
      html += `<h${m[1].length}>${inlineMd(m[2])}</h${m[1].length}>`
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      if (list !== 'ul') {
        closeList()
        html += '<ul>'
        list = 'ul'
      }
      html += `<li>${inlineMd(m[1])}</li>`
    } else if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      if (list !== 'ol') {
        closeList()
        html += '<ol>'
        list = 'ol'
      }
      html += `<li>${inlineMd(m[1])}</li>`
    } else {
      closeList()
      html += `<p>${inlineMd(line)}</p>`
    }
  }
  closeList()
  return html
}

// Ubah waktu ISO jadi durasi "3 jam 12 menit" sampai kuota diperbarui.
function formatUntil(iso) {
  if (!iso) return ''
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'sebentar lagi'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h} jam ${m} menit` : `${m} menit`
}

export default function GeneratorWindow() {
  const { type = 'makalah' } = useParams()
  const [searchParams] = useSearchParams()
  const meta = DOC_LABEL[type] ?? DOC_LABEL.makalah
  const { user, profile, tier, isActive } = useAuth()
  const pkg = getPackage(tier)
  const boleh = canSuggestTitles(tier)

  const [title, setTitle] = useState('')
  const [jurusan, setJurusan] = useState(JURUSAN[0])
  const [keyword, setKeyword] = useState('')
  const [catatan, setCatatan] = useState('')
  const [panjang, setPanjang] = useState('standar')
  // Untuk esai, metode penelitian opsional -> default "tidak ada".
  const [metode, setMetode] = useState(type === 'esai' ? 'tidak' : 'kualitatif')
  const [pustaka, setPustaka] = useState('bebas')

  const metodeOptions = type === 'esai' ? [{ id: 'tidak', label: 'Tidak ada' }, ...METODE_BASE] : METODE_BASE

  const [saran, setSaran] = useState([])
  const [saranBusy, setSaranBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMsg, setModalMsg] = useState(null)

  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [stage, setStage] = useState('Menyiapkan')
  const [percent, setPercent] = useState(0)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [usage, setUsage] = useState(null)
  const [engine, setEngine] = useState('gemini')
  const [athenaUsage, setAthenaUsage] = useState(null)

  const abortRef = useRef(null)
  const outputRef = useRef(null)

  async function loadUsage() {
    try {
      setUsage(await fetchUsage())
    } catch {
      /* abaikan; badge kuota tidak wajib */
    }
  }

  async function loadAthenaUsage() {
    try {
      setAthenaUsage(await fetchAthenaUsage())
    } catch {
      /* abaikan; toggle Athena Mode cuma muncul kalau data ada */
    }
  }

  useEffect(() => {
    if (isActive) {
      loadUsage()
      loadAthenaUsage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  // Buka kembali dokumen yang tersimpan di perangkat (tautan dari Dasbor).
  useEffect(() => {
    const id = searchParams.get('doc')
    if (!id || !user) return
    const d = getLocalDoc(user.uid, id)
    if (d) {
      setTitle(d.title || '')
      setOutput(d.content || '')
      setStage('Dimuat dari perangkat')
      setPercent(100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user])

  const words = useMemo(() => (output.trim() ? output.trim().split(/\s+/).length : 0), [output])

  // Gulir mengikuti teks yang masuk
  useEffect(() => {
    if (running && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output, running])

  async function handleSuggest() {
    if (!boleh) {
      setModalMsg(
        `Fitur Saran Judul hanya tersedia untuk paket Medium (Sharnikas) atau Tinggi (Dikthought). Silakan Upgrade Paket Anda!`,
      )
      setModalOpen(true)
      return
    }
    setSaranBusy(true)
    setError('')
    try {
      const titles = await suggestTitles({ jurusan, docType: type, keyword })
      setSaran(titles)
    } catch (err) {
      if (err.code === 'TIER_LOCKED') {
        setModalMsg(err.message)
        setModalOpen(true)
      } else {
        setError(err.message)
      }
    } finally {
      setSaranBusy(false)
    }
  }

  async function handleGenerate() {
    if (!title.trim()) {
      setError('Tentukan judul dulu sebelum memulai.')
      return
    }
    if (!isActive) {
      setError('Langganan belum aktif. Hubungi admin untuk konfirmasi pembayaran.')
      return
    }

    setError('')
    setSaved(false)
    setOutput('')
    setPercent(2)
    setStage('Menghubungi model')
    setRunning(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await generateDocument(
        { docType: type, title: title.trim(), jurusan, catatan, panjang, metode, pustaka, engine },
        {
          signal: controller.signal,
          onStatus: (s) => {
            if (s.stage) setStage(s.stage)
            if (typeof s.percent === 'number') setPercent(s.percent)
          },
          onChunk: (text) => {
            setOutput((prev) => {
              const next = prev + text
              // Perkiraan kemajuan dari jumlah kata terhadap target jenis dokumen
              const w = next.trim().split(/\s+/).length
              setPercent(Math.min(97, 8 + (w / meta.target) * 89))
              return next
            })
            setStage('Menulis dokumen')
          },
        },
      )
      setPercent(100)
      setStage('Selesai')
      loadUsage()
      if (engine === 'athena') loadAthenaUsage()
    } catch (err) {
      if (err.name === 'AbortError') {
        setStage('Dihentikan')
      } else if (err.code === 'TIER_LOCKED' || err.code === 'SUBSCRIPTION_INACTIVE') {
        setModalMsg(err.message)
        setModalOpen(true)
      } else if (err.code === 'RATE_LIMITED') {
        const sisa = err.resetAt ? ` Kuota diperbarui dalam ${formatUntil(err.resetAt)}.` : ''
        setModalMsg(err.message + sisa)
        setModalOpen(true)
        loadUsage()
      } else if (err.code === 'ATHENA_NO_CREDITS' || err.code === 'ATHENA_TIER_LOCKED' || err.code === 'ATHENA_UNCONFIGURED') {
        setModalMsg(err.message)
        setModalOpen(true)
        loadAthenaUsage()
      } else {
        setError(err.message)
      }
    } finally {
      setRunning(false)
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
  }

  function handleSave() {
    if (!output.trim() || !user) return
    // Disimpan di perangkat pengguna saja — tidak dikirim ke server.
    const ok = saveLocalDoc(user.uid, { type, title: title.trim() || meta.name, content: output })
    if (!ok) {
      setError('Penyimpanan peramban penuh. Unduh dokumen ini lalu hapus sebagian riwayat.')
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  async function handleDownload() {
    // .docx ASLI: tampil sama di HP & laptop, font Comic Sans, margin 4-3-3-3,
    // teks justify, judul/heading 14pt tebal, tabel & rumus rapi.
    setError('')
    try {
      await downloadDocx(output, title.trim() || meta.name)
    } catch {
      setError('Gagal membuat file Word. Coba lagi sebentar.')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <UpgradeModal open={modalOpen} onClose={() => setModalOpen(false)} message={modalMsg} />

      {/* Kepala jendela */}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500 transition hover:text-cyan-neon"
          >
            <ArrowLeft size={13} /> Dasbor
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-white neon-text">{meta.name}</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-cyan-500/25 bg-slate-900/50 px-4 py-2 font-mono text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-lime-cyber shadow-lime" />
          <span className="text-slate-400">{pkg.name}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* ── Panel kiri: penentuan judul & pengaturan ── */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <p className="label">Langkah 1 · Judul</p>

            <textarea
              rows={3}
              className="field mt-1 resize-none"
              placeholder="Ketik judul sendiri, atau ambil dari saran di bawah"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="mt-5 rule" />

            <div className="mt-5">
              <label className="label" htmlFor="jurusan">Jurusan</label>
              <select
                id="jurusan"
                className="field"
                value={jurusan}
                onChange={(e) => setJurusan(e.target.value)}
              >
                {JURUSAN.map((j) => (
                  <option key={j} value={j} className="bg-panel">{j}</option>
                ))}
              </select>
            </div>

            <div className="mt-3">
              <label className="label" htmlFor="keyword">Kata kunci (opsional)</label>
              <input
                id="keyword"
                className="field"
                placeholder="mis. kurikulum merdeka, UMKM digital"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>

            <button
              onClick={handleSuggest}
              disabled={saranBusy}
              className={`mt-4 w-full ${boleh ? 'btn-neon' : 'btn-ghost justify-center border-glow/40 text-[#c9a3ff] hover:border-glow hover:shadow-violet'}`}
            >
              {boleh ? <Lightbulb size={16} /> : <Lock size={14} />}
              {saranBusy ? 'Menyusun saran…' : 'Saran judul'}
            </button>

            {!boleh && (
              <p className="mt-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                Terkunci di paket Faozonica
              </p>
            )}

            {/* Daftar saran */}
            <AnimatePresence>
              {saran.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-2 overflow-hidden"
                >
                  {saran.map((s, i) => (
                    <motion.li
                      key={s}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <button
                        onClick={() => setTitle(s)}
                        className="w-full rounded-lg border border-cyan-500/15 bg-slate-950/50 px-3.5 py-2.5
                                   text-left text-[13px] leading-snug text-slate-300 transition-all duration-200
                                   hover:border-cyan-400/60 hover:text-white hover:shadow-[0_0_18px_rgba(0,242,254,0.3)]"
                      >
                        <span className="mr-2 font-mono text-[10px] text-cyan-400">{String(i + 1).padStart(2, '0')}</span>
                        {s}
                      </button>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </GlassCard>

          <GlassCard className="p-6">
            <p className="label">Langkah 2 · Pengaturan</p>

            {athenaUsage?.enabled && (
              <div className="mt-1 mb-4">
                <span className="label">Mode AI</span>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setEngine('gemini')} className={segCls(engine === 'gemini')}>
                    Thunder Mode
                  </button>
                  <button
                    onClick={() => setEngine('athena')}
                    className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 font-mono text-[11px] uppercase tracking-[0.1em] transition-all duration-200 ${
                      engine === 'athena'
                        ? 'border-glow bg-glow/10 text-[#c9a3ff] shadow-violet'
                        : 'border-white/10 text-slate-500 hover:border-glow/50 hover:text-slate-300'
                    }`}
                  >
                    <Sparkles size={12} /> Athena Mode
                  </button>
                </div>
              </div>
            )}

            <div className="mt-1">
              <span className="label">Panjang dokumen</span>
              <div className="grid grid-cols-3 gap-2">
                {PANJANG.map((p) => (
                  <button key={p.id} onClick={() => setPanjang(p.id)} className={segCls(panjang === p.id)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <span className="label">
                Metode penelitian{type === 'esai' ? ' (opsional)' : ''}
              </span>
              <div className={`grid gap-2 ${metodeOptions.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {metodeOptions.map((m) => (
                  <button key={m.id} onClick={() => setMetode(m.id)} className={segCls(metode === m.id)}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <span className="label">Daftar pustaka (rentang tahun)</span>
              <div className="grid grid-cols-3 gap-2">
                {PUSTAKA.map((p) => (
                  <button key={p.id} onClick={() => setPustaka(p.id)} className={segCls(pustaka === p.id)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="catatan">Catatan untuk AI (opsional)</label>
              <textarea
                id="catatan"
                rows={3}
                className="field resize-none"
                placeholder="mis. fokus ke studi kasus di Indonesia, gaya bahasa formal"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </div>

            {engine === 'athena'
              ? athenaUsage && (
                  <div className="mt-4 rounded-lg border border-glow/25 bg-glow/5 px-3.5 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-slate-300">
                        Kesempatan Athena Mode:{' '}
                        <span className={athenaUsage.remaining === 0 ? 'text-rose-300' : 'text-[#c9a3ff]'}>
                          {athenaUsage.unlimited ? 'tanpa batas' : athenaUsage.remaining}
                        </span>
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        {athenaUsage.unlimited
                          ? 'admin'
                          : athenaUsage.period === 'month'
                            ? athenaUsage.resetAt
                              ? `reset ${formatUntil(athenaUsage.resetAt)}`
                              : 'per bulan'
                            : 'seumur akun'}
                      </span>
                    </div>
                    {!athenaUsage.unlimited && athenaUsage.remaining === 0 && (
                      <a
                        href={waLink('Halo admin Discoleous, saya mau beli tambahan pemakaian Athena Mode (Rp15.000/pakai).')}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost mt-2.5 w-full justify-center border-glow/40 text-[#c9a3ff] hover:border-glow"
                      >
                        <MessageCircle size={13} /> Beli Rp15.000/pakai · WA {ADMIN_WA_DISPLAY}
                      </a>
                    )}
                  </div>
                )
              : usage && (
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-cyan-500/15 bg-slate-950/40 px-3.5 py-2.5">
                    <span className="font-mono text-[11px] text-slate-400">
                      Sisa dokumen:{' '}
                      <span className={usage.remaining === 0 ? 'text-rose-300' : 'text-cyan-200'}>
                        {usage.unlimited ? 'tanpa batas' : `${usage.remaining}/${usage.limit}`}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      {usage.unlimited
                        ? 'admin'
                        : usage.resetAt
                          ? `reset ${formatUntil(usage.resetAt)}`
                          : `tiap ${usage.windowHours} jam`}
                    </span>
                  </div>
                )}

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {running ? (
              <button onClick={handleStop} className="btn-ghost mt-5 w-full justify-center border-rose-500/50 text-rose-200 hover:border-rose-400">
                <Square size={13} /> Hentikan
              </button>
            ) : (
              <button onClick={handleGenerate} className="btn-neon mt-5 w-full">
                <Play size={16} /> Buat dokumen
              </button>
            )}
          </GlassCard>
        </div>

        {/* ── Panel kanan: keluaran ── */}
        <GlassCard className="flex min-h-[560px] flex-col p-0">
          {/* Bilah judul jendela */}
          <div className="flex items-center justify-between border-b border-cyan-500/15 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-lime-cyber/70" />
              <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                keluaran · {type}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleCopy} disabled={!output} className="btn-ghost px-2.5 py-1.5 disabled:opacity-30">
                {copied ? <Check size={13} className="text-lime-cyber" /> : <Copy size={13} />}
                <span className="hidden sm:inline">{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
              <button onClick={handleDownload} disabled={!output} className="btn-ghost px-2.5 py-1.5 disabled:opacity-30" title="Unduh sebagai dokumen Word">
                <Download size={13} /> <span className="hidden sm:inline">Word</span>
              </button>
              <button onClick={handleSave} disabled={!output || running} className="btn-ghost px-2.5 py-1.5 disabled:opacity-30">
                {saved ? <Check size={13} className="text-lime-cyber" /> : <Save size={13} />}
                <span className="hidden sm:inline">{saved ? 'Tersimpan' : 'Simpan'}</span>
              </button>
            </div>
          </div>

          {/* Isi */}
          <div className="flex flex-1 flex-col p-5">
            {running && (
              <div className="mb-4">
                <CyberLoader percent={percent} stage={stage} words={words} />
              </div>
            )}

            {output ? (
              <div
                ref={outputRef}
                className="flex-1 overflow-y-auto rounded-xl border border-white/5
                           bg-slate-950/50 p-6 text-[15px] leading-[1.85] text-slate-200"
              >
                {running ? (
                  <div className="whitespace-pre-wrap">
                    {output}
                    <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-cyan-neon align-middle" />
                  </div>
                ) : (
                  // Setelah selesai: tampilkan rapi (tebal diterapkan, tanda bintang hilang)
                  <div className="docx-preview" dangerouslySetInnerHTML={{ __html: mdToHtml(output) }} />
                )}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <motion.div
                  className="h-20 w-20 rounded-2xl border border-cyan-500/30 shadow-neon-sm"
                  animate={{ rotate: [0, 45, 0], opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <p className="mt-7 font-display text-lg text-slate-300">Jendela keluaran masih kosong</p>
                <p className="mt-1.5 max-w-xs text-sm text-slate-500">
                  Tentukan judul di panel kiri, lalu tekan <span className="text-cyan-300">Buat dokumen</span>.
                  Teks muncul di sini sambil ditulis.
                </p>
              </div>
            )}

            {output && !running && (
              <p className="mt-3 font-mono text-[11px] text-slate-600">
                {words.toLocaleString('id-ID')} kata · {profile?.nama} · {new Date().toLocaleDateString('id-ID')}
              </p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
