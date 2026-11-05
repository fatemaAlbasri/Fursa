const PDFDocument = require('pdfkit')
const { COMPARISON_LABELS } = require('./cvOptimizer')
const { isHeading } = require('./cvStrength')

const TEAL = '#0f766e'
const GREY = '#64748b'
const INK = '#1e293b'

// The built-in PDF fonts only have Western letters (Windows-1252)
const WIN_ANSI = /^[\x20-\x7e\xa0-\xff\n–—‘’“”•…€™]$/u

function assertPrintable(text) {
  if (/(?!\p{Script=Latin})\p{L}/u.test(text)) {
    throw Object.assign(
      new Error('PDF download only supports CVs written in English for now.'),
      { status: 422 }
    )
  }
}

// Drops icons from the CV and simplifies accented letters the font doesn't have
function printable(text) {
  return [...text.replace(/\t/g, ' ').replace(/→/g, '>')]
    .map((c) => {
      if (WIN_ANSI.test(c)) return c
      const plain = c.normalize('NFD')[0]
      return WIN_ANSI.test(plain) ? plain : ''
    })
    .join('')
}

function toBuffer(draw) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    draw(doc)
    doc.end()
  })
}

function sectionTitle(doc, title, color = TEAL) {
  doc.moveDown(0.8)
  if (doc.y > doc.page.height - 100) doc.addPage()
  doc.font('Helvetica-Bold').fontSize(12).fillColor(color).text(title)
  const { left, right } = doc.page.margins
  doc.moveTo(left, doc.y + 2).lineTo(doc.page.width - right, doc.y + 2).strokeColor('#cbd5e1').stroke()
  doc.moveDown(0.5)
}

// Improved CV look: black text, grey rules under headings, blue links
const BLACK = '#000000'
const RULE = '#9e9e9e'
const LINK = '#1155cc'
const BODY_SIZE = 10.5

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?'
const WHEN = `(?:${MONTH}\\s+)?(?:19|20)\\d{2}`
// A date at the end of a line ("Jun 2025 - Sep 2025", "Exp Jan 2027"): needs a month, a range or "Exp" so "since 2020" stays text
const DATE_END = new RegExp(
  `\\s+((?:exp\\.?\\s+${WHEN})|(?:${WHEN}\\s*[-–—]\\s*(?:${WHEN}|present|now|current))|(?:${MONTH}\\s+(?:19|20)\\d{2}))$`,
  'i'
)
const ITEM_BULLET = /^[•\-*–▪·]\s*/
const NUMBERED = /^(\d{1,2})[.)]\s+/
const LABEL = /^([A-Z][^:.]{1,40}):\s+(.+)$/
const SUB_LABEL = /^[A-Za-z][A-Za-z &]{1,30}:$/
const CONTACT = /@|\+?\d[\d\s-]{6,}|linkedin|github|https?:|www\./i
const LINK_PART = /@|linkedin|github|https?:|www\./i

// Writes text in pieces with their own font and colour, on one flowing paragraph
function writeRuns(doc, runs, { x, y = doc.y, width, align = 'left' }) {
  runs.forEach((run, i) => {
    const opts = { width, align, lineGap: 1.5, continued: i < runs.length - 1, underline: !!run.underline }
    doc.font(run.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(run.size || BODY_SIZE).fillColor(run.color || BLACK)
    if (i === 0) doc.text(run.text, x, y, opts)
    else doc.text(run.text, opts)
  })
}

// "Tools Used: React, Node.js" -> bold label, plain rest
const labelled = (text) => {
  const match = text.match(LABEL)
  return match && match[1].split(/\s+/).length <= 6
    ? [{ text: `${match[1]}: `, bold: true }, { text: match[2] }]
    : [{ text }]
}

function cvHeading(doc, title) {
  doc.moveDown(0.9)
  if (doc.y > doc.page.height - 120) doc.addPage()
  const { left, right } = doc.page.margins
  doc.font('Helvetica-Bold').fontSize(11).fillColor(BLACK).text(title.toUpperCase(), left, doc.y)
  const lineY = doc.y + 5
  doc.moveTo(left, lineY).lineTo(doc.page.width - right, lineY).lineWidth(1).strokeColor(RULE).stroke()
  doc.y = lineY + 10
}

// "a | b | c" centred, wrapping at the separators when it doesn't fit (pdfkit can't centre mixed runs itself)
function centredParts(doc, parts, left, width, { bold = false, size = BODY_SIZE } = {}) {
  const font = bold ? 'Helvetica-Bold' : 'Helvetica'
  doc.font(font).fontSize(size)
  const SEP = ' | '
  const rows = [[]]
  for (const part of parts) {
    const row = rows[rows.length - 1]
    const next = [...row, part].map((p) => p.text).join(SEP)
    if (row.length && doc.widthOfString(next) > width) rows.push([part])
    else row.push(part)
  }
  for (const row of rows) {
    const runs = row.flatMap((p, i) => (i ? [{ text: SEP }, p] : [p]))
    const total = runs.reduce((sum, r) => sum + doc.widthOfString(r.text), 0)
    const y = doc.y
    let x = left + Math.max(0, (width - total) / 2)
    for (const run of runs) {
      doc.fillColor(run.color || BLACK).text(run.text, x, y, { lineBreak: false, underline: !!run.underline })
      x += doc.widthOfString(run.text)
    }
    doc.y = y + doc.currentLineHeight(true)
  }
}

// Words that make a header part a job title or field ("Junior Frontend Developer", "Cloud Computing")
const TITLE_WORD = /\b(engineer\w*|develop\w*|graduate|student|science|computing|design\w*|analyst|manager|specialist|consultant|intern|accountant|technician|officer|scientist|architect|administrator|programmer|marketing|finance|business|technology|cloud|data|software|frontend|backend|full.?stack)\b/i

// Name, then the title/specialisation line, then contact details, centred like a classic CV.
// Title and contact parts can share one line in the text ("CS Graduate | Developer noor@x.com | +973..."), so they're split up
function cvHeader(doc, name, headerLines) {
  const { left } = doc.page.margins
  const width = doc.page.width - left - doc.page.margins.right
  doc.font('Helvetica-Bold').fontSize(22).fillColor(BLACK).text(name.trim(), left, doc.y, { width, align: 'center' })
  doc.moveDown(0.3)

  const parts = headerLines
    .flatMap((line) => line.split(/\s*\|\s*/))
    .flatMap((part) => part.split(/\s+(?=\S*@|https?:|www\.)/))
    .map((p) => p.trim())
    .filter(Boolean)
  const titles = parts.filter((p) => TITLE_WORD.test(p) && !CONTACT.test(p))
  const contacts = parts.filter((p) => !titles.includes(p)).map((p) =>
    LINK_PART.test(p) ? { text: p, color: LINK, underline: !p.includes('@') } : { text: p }
  )

  if (titles.length) centredParts(doc, titles.map((text) => ({ text })), left, width, { bold: true, size: 10 })
  if (contacts.length) {
    doc.moveDown(0.4)
    centredParts(doc, contacts, left, width)
  }
}

// Longer capital headings ("SOFTWARE ENGINEERING EXPERIENCE") count here too, only for the layout
const capsHeading = (line) => /^[A-Z][A-Z &/]{3,44}:?$/.test(line) && line.split(/\s+/).length <= 5
const anyHeading = (line) => isHeading(line) || capsHeading(line)

const DATE_ONLY = new RegExp(`^(?:exp\\.?\\s+)?${WHEN}(?:\\s*[-–—]\\s*(?:${WHEN}|present|now|current))?$`, 'i')
const ENDS_OPEN = new RegExp(`(,|-|–|&|\\b(?:and|or|of|the|to|with|in|for|at|exp|${MONTH}))$`, 'i')

// Joins lines the PDF reader broke in the middle of a sentence or a date
function joinBrokenLines(lines) {
  const out = []
  for (const raw of lines) {
    const line = raw.trim()
    const prev = out[out.length - 1]
    const isNew = !line || anyHeading(line) || ITEM_BULLET.test(line) || NUMBERED.test(line)
    const continues = prev && !anyHeading(prev) && (/^[a-z]/.test(line) || ENDS_OPEN.test(prev) || DATE_ONLY.test(line))
    if (!isNew && continues) out[out.length - 1] = `${prev} ${line}`
    else out.push(line)
  }
  return out
}

// The improved CV. Built from the CV's text, so the original design isn't kept, but it follows a clean classic layout
async function renderCv(text) {
  assertPrintable(text)
  const [name = '', ...rawLines] = printable(text.replace(/[●■◦○◆►]/g, '•')).split('\n')
  const lines = joinBrokenLines(rawLines)
  // When the CV writes headings in capitals, "Projects:" under a job is a sub-label, not a new section
  const capsStyle = lines.some((l) => anyHeading(l) && l === l.toUpperCase())
  const sectionHeading = (l) => anyHeading(l) && !(capsStyle && l !== l.toUpperCase() && l.endsWith(':'))
  const firstHeading = lines.findIndex(sectionHeading)
  const headerEnd = firstHeading === -1 ? 0 : firstHeading
  const headerLines = lines.slice(0, headerEnd).filter(Boolean)

  return toBuffer((doc) => {
    const { left } = doc.page.margins
    const fullWidth = doc.page.width - left - doc.page.margins.right
    cvHeader(doc, name, headerLines)

    // Wrapped lines of a bullet keep the bullet's indent until a blank line or heading
    let indent = 0
    for (const line of lines.slice(headerEnd)) {
      if (sectionHeading(line)) {
        indent = 0
        cvHeading(doc, line.replace(/:$/, ''))
        continue
      }
      if (!line) {
        indent = 0
        doc.moveDown(0.5)
        continue
      }
      if (doc.y > doc.page.height - doc.page.margins.bottom - 20) doc.addPage()

      const y = doc.y
      let body = line
      const bullet = line.match(ITEM_BULLET)
      const number = line.match(NUMBERED)
      if (bullet || number) {
        body = line.slice((bullet || number)[0].length)
        indent = number ? 30 : 26
        doc.font('Helvetica').fontSize(BODY_SIZE).fillColor(BLACK)
          .text(bullet ? '•' : `${number[1]}.`, left + 12, y, { lineBreak: false })
      }
      const x = left + indent
      const width = fullWidth - indent

      const date = body.match(DATE_END)
      if (date) {
        // Title in bold up to the first comma, the rest plain, the date bold on the right
        const main = body.slice(0, date.index)
        const comma = main.indexOf(',')
        const withLabel = labelled(main)
        const runs = withLabel.length > 1
          ? withLabel
          : comma === -1
            ? [{ text: main, bold: true }]
            : [{ text: main.slice(0, comma + 1), bold: true }, { text: main.slice(comma + 1) }]
        const dateText = date[1]
        doc.font('Helvetica-Bold').fontSize(BODY_SIZE)
        const dateWidth = doc.widthOfString(dateText)
        writeRuns(doc, runs, { x, y, width: width - dateWidth - 12 })
        const endY = doc.y
        doc.font('Helvetica-Bold').fontSize(BODY_SIZE).fillColor(BLACK)
          .text(dateText, left + fullWidth - dateWidth, y, { lineBreak: false })
        doc.y = Math.max(endY, y + doc.currentLineHeight(true))
      } else if (SUB_LABEL.test(body) && !bullet && !number) {
        writeRuns(doc, [{ text: body, underline: true }], { x, y, width })
      } else {
        writeRuns(doc, labelled(body), { x, y, width, align: indent ? 'left' : 'justify' })
      }
      doc.x = left
    }
  })
}

const SECTION_TITLES = { summary: 'Summary', projects: 'Projects', skills: 'Skills', education: 'Education', layout: 'Layout' }

// The advanced report: score, every suggestion, and the comparison
async function renderReport({ review, suggestions, missing, major, fileName }) {
  const all = [fileName, major, ...suggestions.flatMap((s) => [s.before_text, s.after_text, s.reason || ''])].join('\n')
  assertPrintable(all)

  return toBuffer((doc) => {
    doc.font('Helvetica-Bold').fontSize(20).fillColor(TEAL).text('Your advanced CV report')
    doc.font('Helvetica').fontSize(10).fillColor(GREY).text(printable(fileName))
    doc.moveDown(0.8)
    doc.font('Helvetica-Bold').fontSize(13).fillColor(INK)
      .text(`CV strength: ${review.strength_score} / 100 now, ${review.potential_score} / 100 after all changes`)
    doc.font('Helvetica').fontSize(10).fillColor(GREY)
      .text('Every suggestion uses only what is already in your CV.')

    sectionTitle(doc, 'Section-by-section rewrite')
    for (const s of suggestions) {
      if (doc.y > doc.page.height - 170) doc.addPage()
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(TEAL)
        .text(SECTION_TITLES[s.section] + (s.points ? `  (+${s.points} points)` : ''))
      doc.moveDown(0.2)
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#b91c1c').text('Before')
      doc.font('Helvetica').fontSize(10).fillColor(INK).text(printable(s.before_text) || 'Not in your CV yet')
      doc.moveDown(0.2)
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#15803d').text('After')
      doc.font('Helvetica').fontSize(10).fillColor(INK).text(printable(s.after_text))
      doc.moveDown(0.2)
      doc.font('Helvetica-Oblique').fontSize(9).fillColor(GREY).text(`Why: ${printable(s.reason || '')}`)
      doc.moveDown(0.8)
    }

    if (missing.length) {
      sectionTitle(doc, 'What only you can add')
      doc.font('Helvetica').fontSize(9).fillColor(GREY).text('We never add facts for you. Add these if they are true for you.')
      doc.moveDown(0.4)
      for (const m of missing) {
        const points = m.points ? `  (up to +${m.points} points)` : ''
        doc.font('Helvetica').fontSize(10).fillColor(INK).text(`${SECTION_TITLES[m.section]}: ${m.advice}${points}`)
        doc.moveDown(0.2)
      }
    }

    sectionTitle(doc, `How your CV compares with strong ${printable(major)} CVs`)
    doc.font('Helvetica').fontSize(9).fillColor(GREY)
      .text('What strong entry-level CVs usually include, and whether yours does.')
    doc.moveDown(0.4)
    for (const [key, label] of Object.entries(COMPARISON_LABELS)) {
      const met = review.comparison?.[key] === true
      doc.font('Helvetica-Bold').fontSize(10).fillColor(met ? '#15803d' : '#b45309')
        .text(met ? 'Yes  ' : 'Not yet  ', { continued: true })
        .font('Helvetica').fillColor(INK).text(label)
      doc.moveDown(0.2)
    }
  })
}

module.exports = { renderCv, renderReport }
