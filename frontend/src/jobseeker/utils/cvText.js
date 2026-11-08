// Turns the CV text from the backend (review.cvText) into what the "Your CV" panel shows:
// the name, the lines under it, headings, and the lines that have a suggestion.
// Only for display: the backend decides what each suggestion changes and how it scores.

// Headings the backend's rules know (services/cvStrength.js), plus short lines in capitals
const KNOWN_HEADINGS = [
  'summary', 'professional summary', 'profile', 'about', 'about me', 'objective', 'career objective',
  'experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history',
  'internships', 'projects', 'project', 'academic projects', 'personal projects',
  'skills', 'technical skills', 'key skills', 'core skills', 'tools', 'technologies',
  'education', 'academic background', 'qualifications',
  'hobbies', 'interests', 'references', 'languages', 'certificates', 'certifications', 'courses',
  'relevant courses', 'activities', 'volunteering', 'awards'
]

function isHeadingLine(line) {
  const text = line.trim().replace(/:$/, '').trim()
  if (!text) return false
  if (KNOWN_HEADINGS.includes(text.toLowerCase())) return true
  // An unknown heading in capitals needs at least 6 letters, so a skill on its own line (SQL, HTML) stays text
  const letters = text.replace(/[^A-Z]/g, '').length
  return /^[A-Z][A-Z &/]+$/.test(text) && letters >= 6 && text.length <= 45 && text.split(/\s+/).length <= 5
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// beforeText is copied from cvText by the backend, so an exact match is expected;
// the loose match (any spacing, any case) is only a safety net
function findText(text, quote) {
  const exact = text.indexOf(quote)
  if (exact !== -1) return { start: exact, end: exact + quote.length }
  const pattern = quote.trim().split(/\s+/).map(escapeRegex).join('\\s+')
  if (!pattern) return null
  const match = new RegExp(pattern, 'i').exec(text)
  return match && { start: match.index, end: match.index + match[0].length }
}

// Returns { name, header: [line], items: [{ type: 'heading' | 'line' | 'mark', text?, lines?, ids? }] }.
// A "mark" is one or more lines that a suggestion would change (ids = those suggestions).
// Suggestions with no beforeText (a new section) and the layout suggestion are not marked in the text.
export function buildCvView(cvText, suggestions) {
  const text = cvText || ''
  const lines = text.split('\n')

  const ranges = suggestions
    .filter((s) => s.beforeText && s.section !== 'layout')
    .map((s) => ({ id: s.id, ...findText(text, s.beforeText) }))
    .filter((r) => r.start !== undefined)

  let offset = 0
  const rows = lines.map((line) => {
    const start = offset
    const end = start + line.length
    offset = end + 1
    const ids = line.trim() ? ranges.filter((r) => r.start < end && start < r.end).map((r) => r.id) : []
    return { text: line.trim(), ids }
  })

  const first = rows.findIndex((r) => r.text)
  if (first === -1) return { name: '', header: [], items: [] }
  const name = rows[first].text

  const firstHeading = rows.findIndex((r, i) => i > first && isHeadingLine(r.text))
  // The lines between the name and the first heading (contact details, title) form the header
  const headerEnd = firstHeading === -1 ? first + 1 : firstHeading
  const header = rows.slice(first + 1, headerEnd).filter((r) => r.text && !r.ids.length).map((r) => r.text)

  const items = []
  rows.forEach((row, i) => {
    if (i <= first || !row.text) return
    const inHeader = i < headerEnd
    if (inHeader && !row.ids.length) return
    if (!inHeader && isHeadingLine(row.text)) {
      items.push({ type: 'heading', text: row.text.replace(/:$/, '') })
      return
    }
    if (!row.ids.length) {
      items.push({ type: 'line', text: row.text })
      return
    }
    // Lines that belong to the same suggestion(s) are shown in one box
    const last = items[items.length - 1]
    if (last?.type === 'mark' && last.ids.join() === row.ids.join()) last.lines.push(row.text)
    else items.push({ type: 'mark', ids: row.ids, lines: [row.text] })
  })

  return { name, header, items }
}
