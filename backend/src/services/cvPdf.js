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

// The improved CV. Built from the CV's text, so the original design isn't kept
async function renderCv(text) {
  assertPrintable(text)
  const [name, ...lines] = printable(text).split('\n')

  return toBuffer((doc) => {
    doc.font('Helvetica-Bold').fontSize(18).fillColor(INK).text(name)
    doc.moveDown(0.3)
    for (const line of lines) {
      if (isHeading(line)) {
        sectionTitle(doc, line.trim().replace(/:$/, ''))
      } else if (!line.trim()) {
        doc.moveDown(0.4)
      } else {
        doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(line.trim(), { lineGap: 2 })
      }
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
