const PDFDocument = require('pdfkit')

// Admin overview report: the same numbers as the Overview page, as a PDF

const NAVY = '#183b56'
const TEAL = '#117a7c'
const GREY = '#64748b'
const INK = '#1e293b'
const LINE = '#e2e8f0'
const SOFT = '#f4fafa'

const PERIOD_LABELS = { month: 'This month', '3months': 'Last 3 months', year: 'This year' }
const STATUS_LABELS = { applied: 'New', shortlisted: 'Shortlisted', interview: 'Interview', accepted: 'Accepted', rejected: 'Rejected' }
const TYPE_LABELS = { full_time: 'Full-time', part_time: 'Part-time', internship: 'Internship' }

// The built-in PDF fonts only have Western letters: anything else (e.g. Arabic) is dropped
const printable = (text) =>
  [...String(text ?? '')]
    .map((c) => (/^[\x20-\x7e\xa0-\xff–—‘’“”•…]$/u.test(c) ? c : c.normalize('NFD')[0]))
    .filter((c) => /^[\x20-\x7e\xa0-\xff–—‘’“”•…]$/u.test(c))
    .join('')
    .trim()

const count = (n) => Number(n).toLocaleString('en-US')
const bhd = (n) => `BHD ${Number(n).toFixed(3)}`
const pct = (part, total) => (total ? `${Math.round((part / total) * 100)}%` : '0%')
const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function toBuffer(draw) {
  return new Promise((resolve, reject) => {
    // bufferPages: the footer ("Page 1 of 2") is written once every page exists
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    draw(doc)
    doc.end()
  })
}

function heading(doc, title, sub) {
  const { left } = doc.page.margins
  if (doc.y > doc.page.height - 200) doc.addPage()
  doc.moveDown(1.2)
  doc.font('Helvetica-Bold').fontSize(14).fillColor(NAVY).text(title, left)
  if (sub) doc.font('Helvetica').fontSize(9).fillColor(GREY).text(sub, left)
  doc.moveDown(0.5)
}

// Simple table: columns = [{ label, width, align }], rows = arrays of strings; bold last row when total = true
function table(doc, columns, rows, { total = false } = {}) {
  const { left } = doc.page.margins
  const rowH = 22
  const drawRow = (cells, y, { bold = false, head = false } = {}) => {
    if (head) doc.rect(left, y, columns.reduce((s, c) => s + c.width, 0), rowH).fill(SOFT)
    let x = left
    cells.forEach((cell, i) => {
      const col = columns[i]
      doc.font(bold || head ? 'Helvetica-Bold' : 'Helvetica').fontSize(head ? 9 : 10)
        .fillColor(head ? GREY : INK)
        .text(cell, x + 8, y + 7, { width: col.width - 16, align: col.align || 'left', lineBreak: false, ellipsis: true })
      x += col.width
    })
    doc.moveTo(left, y + rowH).lineTo(x, y + rowH).lineWidth(0.5).strokeColor(LINE).stroke()
  }

  let y = doc.y
  drawRow(columns.map((c) => c.label.toUpperCase()), y, { head: true })
  rows.forEach((cells, i) => {
    y += rowH
    if (y > doc.page.height - doc.page.margins.bottom - rowH) {
      doc.addPage()
      y = doc.page.margins.top
    }
    drawRow(cells, y, { bold: total && i === rows.length - 1 })
  })
  doc.x = left
  doc.y = y + rowH + 4
}

function statCards(doc, cards) {
  const { left } = doc.page.margins
  const width = doc.page.width - left - doc.page.margins.right
  const gap = 10
  const w = (width - gap * (cards.length - 1)) / cards.length
  const h = 70
  const y = doc.y
  cards.forEach((card, i) => {
    const x = left + i * (w + gap)
    doc.roundedRect(x, y, w, h, 8).lineWidth(0.8).strokeColor(LINE).stroke()
    doc.font('Helvetica').fontSize(8.5).fillColor(GREY).text(card.label.toUpperCase(), x + 12, y + 12, { width: w - 24, lineBreak: false })
    // long values ("BHD 1,250.000") get a smaller font so they stay on one line
    let size = 17
    doc.font('Helvetica-Bold')
    while (size > 10 && doc.fontSize(size).widthOfString(card.value) > w - 24) size -= 1
    doc.fillColor(NAVY).text(card.value, x + 12, y + 28, { width: w - 24, lineBreak: false })
    doc.font('Helvetica').fontSize(8.5).fillColor(TEAL).text(card.note, x + 12, y + 51, { width: w - 24, lineBreak: false })
  })
  doc.x = left
  doc.y = y + h + 4
}

function renderAdminReport(data) {
  const period = data.revenue_breakdown.period
  const periodLabel = PERIOD_LABELS[period] || period
  const change = data.revenue.change_pct

  return toBuffer((doc) => {
    const { left } = doc.page.margins
    const width = doc.page.width - left - doc.page.margins.right

    // Title band
    doc.rect(0, 0, doc.page.width, 92).fill(NAVY)
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff').text('Fursa Admin Report', left, 30)
    doc.font('Helvetica').fontSize(10).fillColor('#b9e4e4')
      .text(`Overview   |   Revenue period: ${periodLabel}   |   Generated ${today()}`, left, 60, { width })
    doc.y = 116

    // 1) Key numbers (same as the top cards)
    statCards(doc, [
      { label: 'Job seekers', value: count(data.seekers.total), note: `+${count(data.seekers.this_week)} this week` },
      { label: 'Companies', value: count(data.companies.total), note: `+${count(data.companies.this_week)} this week` },
      { label: 'Active jobs', value: count(data.active_jobs.total), note: `+${count(data.active_jobs.this_week)} this week` },
      {
        label: 'Revenue (month)',
        value: bhd(data.revenue.this_month),
        note: change == null ? 'None last month' : `${change >= 0 ? '+' : ''}${change}% vs last month`
      }
    ])

    // 2) Revenue for the chosen period
    const rev = data.revenue_breakdown
    heading(doc, 'Revenue', `${periodLabel} · simulated payments · before VAT`)
    table(
      doc,
      [
        { label: 'Source', width: width * 0.5 },
        { label: 'Count', width: width * 0.22, align: 'right' },
        { label: 'Amount', width: width * 0.28, align: 'right' }
      ],
      [
        ['Company plans', `${count(rev.plans.companies)} ${rev.plans.companies === 1 ? 'company' : 'companies'}`, bhd(rev.plans.bhd)],
        ['Advanced CV reports', `${count(rev.cv_reports.count)} ${rev.cv_reports.count === 1 ? 'report' : 'reports'}`, bhd(rev.cv_reports.bhd)],
        ['Total', '', bhd(rev.total_bhd)]
      ],
      { total: true }
    )

    // 3) Sign-ups, last 6 months
    heading(doc, 'New sign-ups', 'Last 6 months')
    table(
      doc,
      [
        { label: 'Month', width: width * 0.4 },
        { label: 'Job seekers', width: width * 0.2, align: 'right' },
        { label: 'Companies', width: width * 0.2, align: 'right' },
        { label: 'Total', width: width * 0.2, align: 'right' }
      ],
      data.signups.map((m) => [m.month, count(m.seekers), count(m.companies), count(m.seekers + m.companies)])
    )

    // 4) Applications by status
    const apps = data.applications_by_status
    heading(doc, 'Applications by status', `${count(apps.total)} applications in total`)
    table(
      doc,
      [
        { label: 'Status', width: width * 0.5 },
        { label: 'Applications', width: width * 0.25, align: 'right' },
        { label: 'Share', width: width * 0.25, align: 'right' }
      ],
      apps.items.map((s) => [STATUS_LABELS[s.status] || s.status, count(s.count), pct(s.count, apps.total)])
    )

    // 5) Active jobs by type
    const jobs = data.jobs_by_type
    heading(doc, 'Active jobs by type', `${count(jobs.total)} active jobs`)
    table(
      doc,
      [
        { label: 'Job type', width: width * 0.5 },
        { label: 'Jobs', width: width * 0.25, align: 'right' },
        { label: 'Share', width: width * 0.25, align: 'right' }
      ],
      jobs.items.map((t) => [TYPE_LABELS[t.type] || t.type, count(t.count), pct(t.count, jobs.total)])
    )

    // 6) Top industries
    heading(doc, 'Top industries', 'By number of posted jobs')
    if (data.top_industries.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor(GREY).text('No companies yet.', left)
    } else {
      table(
        doc,
        [
          { label: 'Industry', width: width * 0.5 },
          { label: 'Companies', width: width * 0.25, align: 'right' },
          { label: 'Jobs posted', width: width * 0.25, align: 'right' }
        ],
        data.top_industries.map((i) => [printable(i.industry) || 'Other', count(i.companies), count(i.jobs)])
      )
    }

    // Footer on every page
    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)
      doc.page.margins.bottom = 0 // writing below the margin would otherwise start a new page
      const y = doc.page.height - 36
      doc.font('Helvetica').fontSize(8).fillColor(GREY)
        .text(`Fursa · Admin report · Page ${i + 1} of ${range.count}`, left, y, { width, align: 'center', lineBreak: false })
    }
  })
}

module.exports = { renderAdminReport, PERIOD_LABELS }
