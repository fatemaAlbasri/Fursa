// Small CSV writer for the admin exports (no library needed)
// columns = [{ label, value: (row) => any }]

// "2026-11-27" in the server's time zone (pg gives DATE columns as local midnight,
// so toISOString() would move them a day back in Bahrain)
const day = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// A cell starting with = + - @ would run as a formula in Excel, so it gets a leading '
const safe = (value) => {
  if (value == null) return ''
  const text = value instanceof Date ? day(value) : String(value)
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
}

const quote = (text) => (/[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text)

function toCsv(columns, rows) {
  const lines = [
    columns.map((c) => quote(c.label)).join(','),
    ...rows.map((row) => columns.map((c) => quote(safe(c.value(row)))).join(','))
  ]
  // BOM so Excel opens Arabic names correctly; CRLF line ends like Excel writes them
  return '﻿' + lines.join('\r\n') + '\r\n'
}

// Sends the CSV as a download: "fursa-jobs-2026-11-27.csv"
function sendCsv(res, name, csv) {
  const date = day(new Date())
  res.set('Content-Type', 'text/csv; charset=utf-8')
  res.set('Content-Disposition', `attachment; filename="fursa-${name}-${date}.csv"`)
  res.send(csv)
}

module.exports = { toCsv, sendCsv }
