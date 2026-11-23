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

function toBuffer(draw, options = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, ...options })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    draw(doc)
    doc.end()
  })
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
  if (name.trim()) {
    doc.font('Helvetica-Bold').fontSize(22).fillColor(BLACK).text(name.trim(), left, doc.y, { width, align: 'center' })
    doc.moveDown(0.3)
  }

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
  const allLines = printable(text.replace(/[●■◦○◆►]/g, '•')).split('\n')
  // The first line is the name, unless the CV starts straight with a section ("Summary", "Skills"…):
  // then there is no name, and that heading stays a heading instead of being printed big as the name
  const hasName = Boolean(allLines[0]?.trim()) && !anyHeading(allLines[0])
  const [name = '', ...rawLines] = hasName ? allLines : ['', ...allLines]
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
    const content = lines.slice(headerEnd)
    for (let i = 0; i < content.length; i++) {
      const line = content[i]
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
      } else if (!bullet && !number && !indent && ITEM_BULLET.test(content[i + 1] || '') &&
        body.split(/\s+/).length <= 10 && !/[.:]$/.test(body)) {
        // A short line right above bullets is a job or project title ("Software Development Intern")
        writeRuns(doc, [{ text: body, bold: true }], { x, y, width })
      } else {
        writeRuns(doc, labelled(body), { x, y, width, align: indent ? 'left' : 'justify' })
      }
      doc.x = left
    }
  })
}

const SECTION_TITLES = { summary: 'Summary', projects: 'Projects', skills: 'Skills', education: 'Education', layout: 'Layout' }

// Report colours: each meaning has a strong colour for text and a pale one for backgrounds
const RED = { text: '#b91c1c', bg: '#fef2f2' }
const GREEN = { text: '#15803d', bg: '#f0fdf4' }
const AMBER = { text: '#b45309', bg: '#fffbeb' }
const SLATE = { text: '#475569', bg: '#f1f5f9' }
const TEAL_BG = '#f0fdfa'
const STATUS = {
  accepted: { label: 'ACCEPTED', ...GREEN },
  dismissed: { label: 'DISMISSED', ...SLATE },
  pending: { label: 'NOT DECIDED YET', ...AMBER }
}

const sectionName = (key) => SECTION_TITLES[key] || (key ? key[0].toUpperCase() + key.slice(1) : 'General')
const scoreColour = (score) => (score >= 75 ? GREEN.text : score >= 50 ? AMBER.text : RED.text)

// Small rounded label, returns its width
function pill(doc, text, x, y, { text: color, bg }) {
  doc.font('Helvetica-Bold').fontSize(7.5)
  const w = doc.widthOfString(text) + 12
  doc.roundedRect(x, y, w, 14, 7).fill(bg)
  doc.fillColor(color).text(text, x + 6, y + 4, { lineBreak: false })
  return w
}

// Numbered section heading with a short explanation under it
function reportHeading(doc, number, title, note) {
  doc.moveDown(1.2)
  if (doc.y > doc.page.height - 160) doc.addPage()
  const { left } = doc.page.margins
  const y = doc.y
  doc.circle(left + 9, y + 8, 9).fill(TEAL)
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text(String(number), left, y + 3.5, { width: 18, align: 'center' })
  doc.font('Helvetica-Bold').fontSize(14).fillColor(INK).text(title, left + 26, y + 1)
  if (note) doc.font('Helvetica').fontSize(9).fillColor(GREY).text(note, left + 26, doc.y + 2)
  doc.y += 10
}

// Score card: big number, label and a bar out of 100
function scoreCard(doc, { x, y, w, label, score }) {
  const h = 78
  doc.roundedRect(x, y, w, h, 8).fill(SLATE.bg)
  doc.font('Helvetica').fontSize(9).fillColor(GREY).text(label, x + 14, y + 12, { width: w - 28 })
  doc.font('Helvetica-Bold').fontSize(26).fillColor(scoreColour(score)).text(String(score), x + 14, y + 26, { continued: true })
    .fontSize(11).fillColor(GREY).text(' / 100')
  const barW = w - 28
  doc.roundedRect(x + 14, y + h - 16, barW, 6, 3).fill('#e2e8f0')
  doc.roundedRect(x + 14, y + h - 16, Math.max(6, (barW * Math.min(score, 100)) / 100), 6, 3).fill(scoreColour(score))
}

// Pale box with a coloured bar on the left: a label and the text
function textBox(doc, { x, y, w, label, text, colour, italic = false }) {
  const textW = w - 26
  doc.font(italic ? 'Helvetica-Oblique' : 'Helvetica').fontSize(10)
  const h = doc.heightOfString(text, { width: textW, lineGap: 1.5 }) + 30
  doc.rect(x, y, w, h).fill(colour.bg)
  doc.rect(x, y, 3, h).fill(colour.text)
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(colour.text).text(label, x + 13, y + 9, { characterSpacing: 0.6 })
  doc.font(italic ? 'Helvetica-Oblique' : 'Helvetica').fontSize(10).fillColor(INK)
    .text(text, x + 13, y + 21, { width: textW, lineGap: 1.5 })
  return h
}

function boxHeight(doc, text, w, italic = false) {
  doc.font(italic ? 'Helvetica-Oblique' : 'Helvetica').fontSize(10)
  return doc.heightOfString(text, { width: w - 26, lineGap: 1.5 }) + 30
}

// The advanced report: score, every suggestion, what to add, and the comparison
async function renderReport({ review, suggestions, missing, reachable = review.potential_score, major, fileName }) {
  const all = [fileName, major, ...suggestions.flatMap((s) => [s.before_text, s.after_text, s.reason || ''])].join('\n')
  assertPrintable(all)
  const field = printable(major || 'your field')
  const comparison = Object.entries(COMPARISON_LABELS).map(([key, label]) => ({ label, met: review.comparison?.[key] === true }))
  const metCount = comparison.filter((c) => c.met).length
  const gain = Math.max(0, review.potential_score - review.strength_score)

  return toBuffer((doc) => {
    const { left } = doc.page.margins
    const width = doc.page.width - left - doc.page.margins.right

    // Title band
    doc.rect(0, 0, doc.page.width, 92).fill(TEAL)
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff').text('Advanced CV Report', left, 30)
    doc.font('Helvetica').fontSize(10).fillColor('#ccfbf1')
      .text(`${printable(fileName)}   |   ${field}   |   ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, left, 58, { width })
    doc.y = 120

    // Scores: now -> after the rewrites -> what they can reach by adding what's missing.
    // The third card shows the rewrites are a first step, not the ceiling
    const cards = [
      { label: 'Your CV strength now', score: review.strength_score },
      { label: 'After the rewrites below', score: review.potential_score },
      ...(reachable > review.potential_score ? [{ label: "Up to, if you add what's missing", score: reachable }] : [])
    ]
    const gap = 12
    const cardW = (width - gap * (cards.length - 1)) / cards.length
    const cardsY = doc.y
    cards.forEach((card, i) => scoreCard(doc, { x: left + i * (cardW + gap), y: cardsY, w: cardW, ...card }))
    doc.y = cardsY + 92

    // At a glance
    const extra = Math.max(0, reachable - review.potential_score)
    const glance = [
      `${suggestions.length} rewrite${suggestions.length === 1 ? '' : 's'} ready to use${gain ? ` (up to +${gain} points)` : ''}`,
      `${missing.length} thing${missing.length === 1 ? '' : 's'} only you can add${extra ? ` (up to +${extra} more points)` : ''}`,
      `${metCount} of ${comparison.length} things strong ${field} CVs usually have, after the changes`
    ]
    const glanceY = doc.y
    const glanceH = 20 + glance.length * 16
    doc.roundedRect(left, glanceY, width, glanceH, 8).fill(TEAL_BG)
    glance.forEach((line, i) => {
      const ly = glanceY + 12 + i * 16
      doc.circle(left + 18, ly + 5, 2.5).fill(TEAL)
      doc.font('Helvetica').fontSize(10).fillColor(INK).text(line, left + 28, ly, { width: width - 40 })
    })
    doc.y = glanceY + glanceH
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(GREY)
      .text('Every suggestion uses only what is already in your CV. We never add facts for you.', left, doc.y + 8, { width })

    // 1. Rewrites
    reportHeading(doc, 1, 'Section-by-section rewrite', 'Replace the "Before" text in your CV with the "After" text.')
    suggestions.forEach((s, i) => {
      const before = printable(s.before_text || '') || 'Not in your CV yet'
      const after = printable(s.after_text || '')
      const why = printable(s.reason || '')
      const cardH = 26 + boxHeight(doc, before, width) + 6 + boxHeight(doc, after, width) + (why ? 6 + boxHeight(doc, why, width, true) : 0)
      if (doc.y + cardH > doc.page.height - doc.page.margins.bottom && cardH < doc.page.height - 120) doc.addPage()

      let y = doc.y
      doc.font('Helvetica-Bold').fontSize(11).fillColor(TEAL).text(`${i + 1}. ${sectionName(s.section)}`, left, y + 2, { lineBreak: false })
      let px = left + doc.widthOfString(`${i + 1}. ${sectionName(s.section)}`) + 10
      if (s.points) px += pill(doc, `+${s.points} POINTS`, px, y + 1, GREEN) + 6
      const status = STATUS[s.status]
      if (status) {
        doc.font('Helvetica-Bold').fontSize(7.5)
        pill(doc, status.label, left + width - doc.widthOfString(status.label) - 12, y + 1, status)
      }
      y += 24
      y += textBox(doc, { x: left, y, w: width, label: 'BEFORE', text: before, colour: RED }) + 6
      y += textBox(doc, { x: left, y, w: width, label: 'AFTER', text: after, colour: GREEN })
      if (why) y += 6
      if (why) y += textBox(doc, { x: left, y, w: width, label: 'WHY THIS IS BETTER', text: why, colour: SLATE, italic: true })
      doc.y = y + 18
    })
    if (!suggestions.length) doc.font('Helvetica').fontSize(10).fillColor(GREY).text('No rewrites needed.', left)

    // 2. Missing content
    if (missing.length) {
      reportHeading(doc, 2, 'What only you can add', 'Still missing after the changes above. Add these only if they are true for you.')
      for (const m of missing) {
        const advice = printable(m.advice || '')
        doc.font('Helvetica').fontSize(10)
        const h = Math.max(32, doc.heightOfString(advice, { width: width - 150 }) + 22)
        if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage()
        const y = doc.y
        doc.roundedRect(left, y, width, h, 6).fill(AMBER.bg)
        doc.rect(left + 12, y + 11, 10, 10).lineWidth(1.2).strokeColor(AMBER.text).stroke()
        doc.font('Helvetica-Bold').fontSize(8).fillColor(AMBER.text).text(sectionName(m.section).toUpperCase(), left + 32, y + 8)
        doc.font('Helvetica').fontSize(10).fillColor(INK).text(advice, left + 32, doc.y + 2, { width: width - 150 })
        if (m.points) pill(doc, `UP TO +${m.points} POINTS`, left + width - 100, y + 9, GREEN)
        doc.y = y + h + 6
      }

      // Next step: the missing items only count once they're in the CV and it's uploaded again
      const note = `Add the items above that are true for you, then upload your CV again to get your new score${extra ? ` (up to ${reachable} / 100)` : ''}.`
      doc.font('Helvetica').fontSize(10)
      const h = doc.heightOfString(note, { width: width - 32 }) + 34
      if (doc.y + 6 + h > doc.page.height - doc.page.margins.bottom) doc.addPage()
      else doc.y += 6
      const y = doc.y
      doc.roundedRect(left, y, width, h, 8).fill(TEAL_BG)
      doc.rect(left, y, 3, h).fill(TEAL)
      doc.font('Helvetica-Bold').fontSize(8).fillColor(TEAL).text('NEXT STEP', left + 16, y + 10, { characterSpacing: 0.6 })
      doc.font('Helvetica').fontSize(10).fillColor(INK).text(note, left + 16, y + 23, { width: width - 32 })
      doc.y = y + h
    }

    // 3. Comparison
    reportHeading(doc, missing.length ? 3 : 2, `How your CV compares with strong ${field} CVs`,
      `What strong entry-level CVs usually include. After the changes above, yours has ${metCount} of ${comparison.length}.`)
    comparison.forEach(({ label, met }, i) => {
      if (doc.y + 26 > doc.page.height - doc.page.margins.bottom) doc.addPage()
      const y = doc.y
      if (i % 2 === 0) doc.rect(left, y, width, 26).fill('#f8fafc')
      const mark = met ? GREEN : AMBER
      doc.circle(left + 14, y + 13, 6).fill(mark.text)
      if (met) doc.moveTo(left + 11, y + 13).lineTo(left + 13.5, y + 15.5).lineTo(left + 17.5, y + 10.5).lineWidth(1.5).strokeColor('#ffffff').stroke()
      else doc.moveTo(left + 11, y + 13).lineTo(left + 17, y + 13).lineWidth(1.5).strokeColor('#ffffff').stroke()
      doc.font('Helvetica').fontSize(10).fillColor(INK).text(label, left + 30, y + 8, { width: width - 120, lineBreak: false })
      doc.font('Helvetica-Bold').fontSize(9).fillColor(mark.text).text(met ? 'Yes' : 'Not yet', left + width - 70, y + 8.5, { width: 60, align: 'right' })
      doc.y = y + 26
    })

    // Page numbers
    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)
      const bottom = doc.page.margins.bottom
      doc.page.margins.bottom = 0
      doc.moveTo(left, doc.page.height - 36).lineTo(left + width, doc.page.height - 36).lineWidth(0.5).strokeColor('#e2e8f0').stroke()
      doc.font('Helvetica').fontSize(8).fillColor(GREY)
        .text('Fursa - Advanced CV Report', left, doc.page.height - 28, { lineBreak: false })
        .text(`Page ${i + 1} of ${range.count}`, left, doc.page.height - 28, { width, align: 'right', lineBreak: false })
      doc.page.margins.bottom = bottom
    }
  }, { bufferPages: true })
}

module.exports = { renderCv, renderReport }
