const { reviewCvWithAi } = require('./cvAi')
const { knownSkillNames, hasWord, escapeRegex } = require('./cvParser')
const { scoreCv, isHeading, SECTION_MAX, SAME_SKILL } = require('./cvStrength')

const SECTIONS = Object.keys(SECTION_MAX)
const LAYOUT_SEPARATOR = /\s*(?:>|→|\n)\s*/

const COMPARISON_LABELS = {
  short_summary: 'A short, specific summary',
  projects_with_tools: 'Projects with the tools used',
  full_skill_names: 'Skills written in full names',
  portfolio_link: 'A link to your work (GitHub or portfolio), if you have one',
  relevant_courses: 'Relevant courses listed under Education',
  one_page: 'One page, clear headings'
}

// pdf-parse leaves page markers like "-- 1 of 2 --" in parsed_text
const PAGE_MARKER = /^\s*-- \d+ of (\d+) --\s*$/gm

function cleanCvText(text) {
  return text
    .replace(PAGE_MARKER, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function isOnePage(text) {
  const pages = [...text.matchAll(PAGE_MARKER)].map((m) => Number(m[1]))
  // Word files have no markers, so go by length
  return pages.length ? Math.max(...pages) === 1 : text.split(/\s+/).length <= 600
}

const hasWorkLink = (text) => /github\.com|gitlab\.com|behance\.net|dribbble\.com|portfolio/i.test(text)

// Where a sentence copied from the CV is, allowing for different spacing and line breaks
function findInCv(text, quote) {
  const pattern = quote.trim().split(/\s+/).map(escapeRegex).join('\\s+')
  const match = new RegExp(pattern, 'i').exec(text)
  return match && { start: match.index, end: match.index + match[0].length, text: match[0] }
}

function headingLines(text) {
  return text.split('\n').map((line) => line.trim().replace(/:$/, '').toLowerCase())
}

const splitLayout = (value) => value.split(LAYOUT_SEPARATOR).map((h) => h.trim()).filter(Boolean)

// A layout change must be the CV's own headings in a different order
function validLayout(text, before, after) {
  const from = splitLayout(before).map((h) => h.toLowerCase())
  const to = splitLayout(after).map((h) => h.toLowerCase())
  const lines = headingLines(text)
  return (
    from.length > 1 &&
    from.every((h) => lines.includes(h)) &&
    [...from].sort().join() === [...to].sort().join() &&
    from.join() !== to.join()
  )
}

// Returns what the rewrite claims that the CV doesn't say, or null if it's all in the CV.
// The AI is told never to add anything; this makes sure of it.
function findAddedFact(after, section, cvText, knownSkills) {
  const skillIsInCv = (skill) => {
    const shortForms = SAME_SKILL[skill.toLowerCase()] || []
    return [skill, ...shortForms].some((name) => hasWord(cvText, name))
  }
  // A short form in the rewrite is the same skill as its full name in the CV
  const isInCv = (word) => {
    if (hasWord(cvText, word)) return true
    return Object.entries(SAME_SKILL).some(
      ([full, shortForms]) =>
        (word.toLowerCase() === full || shortForms.includes(word.toLowerCase())) &&
        skillIsInCv(full)
    )
  }

  const number = (after.match(/\d+(?:[.,]\d+)*/g) || []).find((n) => !hasWord(cvText, n))
  if (number) return number

  const skill = knownSkills.find((s) => hasWord(after, s) && !skillIsInCv(s))
  if (skill) return skill

  // Hyphens split words, so "JavaScript-based" is checked as "JavaScript" and "based"
  const words = [...after.matchAll(/[A-Za-z][A-Za-z0-9+#]*(?:[./][A-Za-z0-9+#]+)*/g)]
  for (const { 0: word, index } of words) {
    if (isInCv(word)) continue
    // A skills list is only names, so every word has to come from the CV
    if (section === 'skills' && !/^(and|courses|skills)$/i.test(word)) return word
    // Elsewhere, look for names: a capital mid-sentence, or an odd one anywhere (AWS, GraphQL)
    const startsSentence = index === 0 || /[.:!?·•\n(]\s*$/.test(after.slice(0, index))
    const oddCapitals = /[A-Z0-9]/.test(word.slice(1))
    if (oddCapitals || (/^[A-Z]/.test(word) && !startsSentence)) return word
  }
  return null
}

const drop = (s, why) => console.warn(`CV suggestion dropped (${s.section}): ${why}`)

// Keeps only suggestions we can stand behind
function checkSuggestions(aiSuggestions, cvText, knownSkills) {
  const taken = []
  const kept = []

  const ranked = [...aiSuggestions].sort((a, b) => SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section))
  for (const s of ranked) {
    const after = (s.after || '').trim()
    const reason = (s.reason || '').trim()
    let before = (s.before || '').trim()
    if (!after || !reason) { drop(s, 'empty'); continue }

    if (s.section === 'layout') {
      if (kept.some((k) => k.section === 'layout')) { drop(s, 'second layout change'); continue }
      if (!validLayout(cvText, before, after)) { drop(s, 'not a reorder of the CV headings'); continue }
    } else {
      const added = findAddedFact(after, s.section, cvText, knownSkills)
      if (added) { drop(s, `adds "${added}", which is not in the CV`); continue }

      if (before) {
        const found = findInCv(cvText, before)
        if (!found) { drop(s, 'before text is not in the CV'); continue }
        if (taken.some((t) => found.start < t.end && t.start < found.end)) { drop(s, 'overlaps another'); continue }
        if (found.text.toLowerCase() === after.toLowerCase()) { drop(s, 'changes nothing'); continue }
        taken.push(found)
        before = found.text // exact wording, so the frontend can highlight it
      } else if (!['summary', 'skills'].includes(s.section) || kept.some((k) => k.section === s.section && !k.before)) {
        drop(s, 'nothing to replace')
        continue
      }
    }

    kept.push({ section: s.section, before, after, reason })
  }
  return kept
}

// A suggestion is worth what it adds to the score once applied. One that lowers the score is dropped.
// A rewording the rules can't see is worth 0 points, but is still useful, so it stays
function addPoints(suggestions, text, startScore, scoreOptions) {
  const applied = []
  const kept = []
  let score = startScore
  for (const s of suggestions) {
    const row = { section: s.section, before_text: s.before, after_text: s.after, status: 'accepted' }
    const next = scoreCv(applySuggestions(text, [...applied, row]), scoreOptions).total
    if (next < score) { drop(s, `lowers the score from ${score} to ${next}`); continue }
    // The rules decide what a good order is, so a reorder that adds nothing is only a matter of taste
    if (s.section === 'layout' && next === score) { drop(s, 'reorder adds nothing'); continue }
    applied.push(row)
    kept.push({ ...s, points: next - score })
    score = next
  }
  return kept
}

// Reviews a CV: AI writes the feedback; the checks and the score are done here
async function reviewCv(rawText, { major }) {
  const text = cleanCvText(rawText)
  const knownSkills = await knownSkillNames()
  const ai = await reviewCvWithAi(text, { major, today: new Date().toISOString().slice(0, 10) })

  const aiSuggestions = Array.isArray(ai.suggestions) ? ai.suggestions.filter((s) => SECTIONS.includes(s?.section)) : []
  const checked = checkSuggestions(aiSuggestions, text, knownSkills)

  // It had things to say but none were safe to show: try again rather than say the CV is perfect
  if (aiSuggestions.length && !checked.length) throw new Error('Every suggestion failed the checks')

  const onePage = isOnePage(rawText)
  const scoreOptions = { knownSkills, onePage }
  const current = scoreCv(text, scoreOptions)
  const suggestions = addPoints(checked, text, current.total, scoreOptions)
  return {
    strength: current.total,
    potential: current.total + suggestions.reduce((sum, s) => sum + s.points, 0),
    suggestions,
    comparison: { ...current.comparison, portfolio_link: hasWorkLink(text), one_page: onePage }
  }
}

function moveSections(text, before, after) {
  const lines = text.split('\n')
  const key = (line) => line.trim().replace(/:$/, '').toLowerCase()
  const from = splitLayout(before).map((h) => h.toLowerCase())
  const starts = lines.map((line, i) => (from.includes(key(line)) ? i : -1)).filter((i) => i !== -1)
  if (starts.length !== from.length) return text

  const blocks = new Map(
    starts.map((start, i) => [key(lines[start]), lines.slice(start, starts[i + 1]).join('\n').trim()])
  )
  const top = lines.slice(0, starts[0]).join('\n').trim()
  const moved = splitLayout(after).map((h) => blocks.get(h.toLowerCase()))
  return [top, ...moved].filter(Boolean).join('\n\n')
}

// A new section goes before the first heading, or at the end if there are none
function addSection(text, title, body) {
  if (title === 'Skills') return `${text}\n\n${title}\n${body}`
  const lines = text.split('\n')
  const first = lines.findIndex(isHeading)
  if (first === -1) return `${text}\n\n${title}\n${body}`
  return [...lines.slice(0, first), title, body, '', ...lines.slice(first)].join('\n')
}

// The CV text with the accepted suggestions applied
function applySuggestions(rawText, suggestions) {
  let text = cleanCvText(rawText)
  const accepted = suggestions.filter((s) => s.status === 'accepted')

  for (const s of accepted) {
    if (s.section === 'layout') continue
    if (!s.before_text) {
      text = addSection(text, s.section === 'summary' ? 'Summary' : 'Skills', s.after_text)
      continue
    }
    const found = findInCv(text, s.before_text)
    if (found) text = text.slice(0, found.start) + s.after_text + text.slice(found.end)
  }
  const layout = accepted.find((s) => s.section === 'layout')
  return layout ? moveSections(text, layout.before_text, layout.after_text) : text
}

module.exports = { reviewCv, applySuggestions, cleanCvText, COMPARISON_LABELS }
