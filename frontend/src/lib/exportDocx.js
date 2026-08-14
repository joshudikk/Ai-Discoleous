// Ekspor hasil generate (Markdown) menjadi berkas Word .docx ASLI.
//
// Kenapa .docx asli (bukan .doc berbasis HTML): file .docx tampil SAMA di
// Word desktop, Word HP, Google Docs, maupun WPS. Format, font, margin, dan
// tabel ikut tertanam di dalam file — tidak bergantung pada aplikasi pembuka.
//
// Ketentuan: font Comic Sans MS, teks 12pt rata kanan-kiri (justify), judul &
// heading 14pt tebal, kertas A4 margin 4-3-3-3 (kiri 4cm, atas/kanan/bawah 3cm).

import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertMillimetersToTwip,
} from 'docx'
import JSZip from 'jszip'

// Font pengganti kalau font utama tidak terpasang (mis. di HP Android).
const FALLBACK_FONT = 'Georgia'

const FONT = 'Times New Roman'
const SZ_BODY = 24 // 12pt (satuan half-point)
const SZ_HEAD = 28 // 14pt

// ── Rumus LaTeX → teks Unicode (biar rapi di Word) ─────────────────────────────
const MATH = {
  '\\times': '×', '\\div': '÷', '\\pm': '±', '\\cdot': '·', '\\leq': '≤', '\\le': '≤',
  '\\geq': '≥', '\\ge': '≥', '\\neq': '≠', '\\approx': '≈', '\\infty': '∞', '\\sum': 'Σ',
  '\\prod': 'Π', '\\int': '∫', '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
  '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ', '\\pi': 'π', '\\rho': 'ρ', '\\sigma': 'σ',
  '\\phi': 'φ', '\\omega': 'ω', '\\Delta': 'Δ', '\\Sigma': 'Σ', '\\Omega': 'Ω',
  '\\rightarrow': '→', '\\to': '→', '\\ldots': '…', '\\dots': '…',
}
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', n: 'ⁿ' }
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', i: 'ᵢ', j: 'ⱼ', n: 'ₙ' }

function uni(s, map) {
  let out = ''
  for (const ch of s) {
    if (!map[ch]) return null
    out += map[ch]
  }
  return out
}

function mathToText(src) {
  let t = src
  t = t.replace(/\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
  t = t.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)')
  t = t.replace(/\\(?:text|mathrm|mathbf|operatorname)\s*\{([^{}]*)\}/g, '$1')
  for (const [k, v] of Object.entries(MATH)) t = t.split(k).join(v)
  t = t.replace(/\^\{([^{}]+)\}|\^(\w)/g, (_, a, b) => uni(a ?? b, SUP) ?? `^${a ?? b}`)
  t = t.replace(/_\{([^{}]+)\}|_(\w)/g, (_, a, b) => uni(a ?? b, SUB) ?? `_${a ?? b}`)
  t = t.replace(/\\left|\\right|\\[a-zA-Z]+/g, '')
  return t.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim()
}

// ── Parsing teks sebaris: **tebal**, *miring*, `kode`, rumus $...$ ──────────────
// Bintang penanda dibuang; formatnya tetap diterapkan. Bintang nyasar dihapus.
function stripStars(t) {
  return t.replace(/\*+/g, '')
}

function parseInline(text, { size = SZ_BODY, forceBold = false } = {}) {
  let s = text
    .replace(/\$([^$]+)\$/g, (_, m) => mathToText(m))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => mathToText(m))

  const runs = []
  const re = /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g
  let last = 0
  let m
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) runs.push({ text: stripStars(s.slice(last, m.index)) })
    if (m[1] !== undefined) runs.push({ text: m[1], bold: true, italics: true })
    else if (m[2] !== undefined) runs.push({ text: m[2], bold: true })
    else if (m[3] !== undefined) runs.push({ text: m[3], italics: true })
    else runs.push({ text: m[4], font: 'Courier New' })
    last = re.lastIndex
  }
  if (last < s.length) runs.push({ text: stripStars(s.slice(last)) })
  if (runs.length === 0) runs.push({ text: '' })

  return runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: forceBold || !!r.bold,
        italics: !!r.italics,
        font: r.font || FONT,
        size,
      }),
  )
}

const body = (text) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160, line: 360 }, // line 360 = spasi 1.5
    children: parseInline(text),
  })

const heading = (text, center = false) =>
  new Paragraph({
    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: 240, after: 120, line: 300 },
    children: parseInline(text, { size: SZ_HEAD, forceBold: true }),
  })

const bullet = (text) =>
  new Paragraph({
    bullet: { level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 80, line: 360 },
    children: parseInline(text),
  })

const ordered = (num, text) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 80, line: 360 },
    indent: { left: convertMillimetersToTwip(8), hanging: convertMillimetersToTwip(8) },
    children: [new TextRun({ text: `${num}. `, font: FONT, size: SZ_BODY }), ...parseInline(text)],
  })

const mono = (text) =>
  new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text, font: 'Courier New', size: 22 })],
  })

const rumus = (text) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
    children: [new TextRun({ text: mathToText(text), font: FONT, size: SZ_BODY })],
  })

// ── Tabel ──────────────────────────────────────────────────────────────────────
const CELL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
const BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER }

function cell(text, header) {
  return new TableCell({
    borders: BORDERS,
    shading: header ? { fill: 'E8E8E8' } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: header ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: parseInline(text, { forceBold: !!header }),
      }),
    ],
  })
}

function buildTable(headCells, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headCells.map((c) => cell(c, true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((c) => cell(c, false)) })),
    ],
  })
}

// ── Markdown → daftar blok docx ────────────────────────────────────────────────
const isRow = (l) => /^\s*\|.*\|\s*$/.test(l)
const isSep = (l) => /^\s*\|[\s:|-]+\|\s*$/.test(l) && l.includes('-')
const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

function markdownToBlocks(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const blocks = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, '')
    if (!line.trim()) continue

    // Blok kode ```
    if (/^\s*```/.test(line)) {
      i++
      while (i < lines.length && !/^\s*```/.test(lines[i])) blocks.push(mono(lines[i++]))
      continue
    }

    // Rumus blok $$ ... $$
    if (/^\s*\$\$/.test(line)) {
      let bd = line.replace(/^\s*\$\$/, '')
      if (bd.trim().endsWith('$$')) bd = bd.trim().replace(/\$\$$/, '')
      else {
        i++
        while (i < lines.length && !lines[i].includes('$$')) bd += ' ' + lines[i++]
        if (i < lines.length) bd += ' ' + lines[i].replace(/\$\$.*$/, '')
      }
      blocks.push(rumus(bd))
      continue
    }

    // Tabel
    if (isRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const head = cells(line)
      i += 2
      const rows = []
      while (i < lines.length && isRow(lines[i])) rows.push(cells(lines[i++]))
      i--
      blocks.push(buildTable(head, rows))
      continue
    }

    // Garis pemisah → dilewati (tidak perlu di dokumen formal)
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) continue

    let m
    if ((m = line.match(/^#\s+(.*)$/))) blocks.push(heading(m[1], true)) // judul utama, rata tengah
    else if ((m = line.match(/^#{2,6}\s+(.*)$/))) blocks.push(heading(line.replace(/^#{2,6}\s+/, ''), false))
    else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) blocks.push(bullet(m[1]))
    else if ((m = line.match(/^\s*(\d+)\.\s+(.*)$/))) blocks.push(ordered(m[1], m[2]))
    else blocks.push(body(line))
  }

  if (blocks.length === 0) blocks.push(body(''))
  return blocks
}

// Sisipkan altName (font pengganti) ke tabel font Word. Word memakai font ini
// otomatis kalau Comic Sans MS tidak ada di perangkat — jadi minimal jadi
// Times New Roman, bukan font acak.
async function patchFontFallback(blob) {
  try {
    const zip = await JSZip.loadAsync(blob)
    const path = 'word/fontTable.xml'
    const file = zip.file(path)
    if (!file) return blob
    let xml = await file.async('string')
    const ALT = `<w:altName w:val="${FALLBACK_FONT}"/>`
    const ENTRY =
      `<w:font w:name="${FONT}">${ALT}<w:charset w:val="00"/>` +
      '<w:family w:val="roman"/><w:pitch w:val="variable"/></w:font>'
    if (new RegExp(`w:name="${FONT}"`).test(xml)) {
      if (!xml.includes(ALT)) {
        xml = xml.replace(new RegExp(`(<w:font w:name="${FONT}"[^>]*>)`), `$1${ALT}`)
      }
    } else if (/<w:fonts\b[^>]*\/>/.test(xml)) {
      xml = xml.replace(/(<w:fonts\b[^>]*)\/>/, `$1>${ENTRY}</w:fonts>`)
    } else {
      xml = xml.replace('</w:fonts>', `${ENTRY}</w:fonts>`)
    }
    zip.file(path, xml)
    return zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
  } catch {
    return blob // kalau patch gagal, pakai file apa adanya (Comic Sans tetap primer)
  }
}

/** Bangun Blob .docx dari teks Markdown. */
export async function buildDocx(markdown) {
  const M = convertMillimetersToTwip
  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: SZ_BODY } } } },
    sections: [
      {
        properties: {
          page: { margin: { top: M(30), right: M(30), bottom: M(30), left: M(40) } }, // 4-3-3-3
        },
        children: markdownToBlocks(markdown),
      },
    ],
  })
  const blob = await Packer.toBlob(doc)
  return patchFontFallback(blob)
}

/** Bangun & unduh langsung. */
export async function downloadDocx(markdown, judul) {
  const blob = await buildDocx(markdown)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(judul || 'dokumen').trim().slice(0, 60) || 'dokumen'}.docx`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
