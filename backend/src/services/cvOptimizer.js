const { reviewCvWithAi, SECTION_MAX } = require('./cvAi')
const { knownSkillNames, hasWord, escapeRegex } = require('./cvParser')

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

// Short forms that mean the same skill, so spelling one out doesn't count as adding it
const SAME_SKILL = {
  javascript: ['js', 'es6'],
  typescript: ['ts'],
  react: ['reactjs', 'react.js'],
  'node.js': ['node', 'nodejs'],
  postgresql: ['postgres'],
  'c#': ['csharp'],
  'machine learning': ['ml'],
  'ui/ux design': ['ui/ux', 'ux', 'ui']
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

  const words = [...after.matchAll(/[A-Za-z][A-Za-z0-9+#]*(?:[./-][A-Za-z0-9+#]+)*/g)]
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

// Keeps only suggestions we can stand behind and works out the points they are worth
function checkSuggestions(aiSuggestions, scores, cvText, knownSkills) {
  const taken = []
  const pointsLeft = Object.fromEntries(SECTIONS.map((s) => [s, SECTION_MAX[s] - scores[s]]))
  const kept = []
  const drop = (s, why) => console.warn(`CV suggestion dropped (${s.section}): ${why}`)

  const ranked = [...aiSuggestions].sort(
    (a, b) => SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section) || b.points - a.points
  )
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

    const points = Math.min(Math.round(Number(s.points)) || 0, pointsLeft[s.section])
    if (points < 1) { drop(s, 'worth no points'); continue }
    pointsLeft[s.section] -= points
    kept.push({ section: s.section, before, after, reason, points })
  }
  return kept
}

// Reviews a CV: AI writes the feedback, then the score and points are checked and worked out here
async function reviewCv(rawText, { major }) {
  const text = cleanCvText(rawText)
  const ai = await reviewCvWithAi(text, { major, today: new Date().toISOString().slice(0, 10) })

  const scores = Object.fromEntries(
    SECTIONS.map((s) => [s, Math.max(0, Math.min(SECTION_MAX[s], Math.round(Number(ai.scores?.[s])) || 0))])
  )
  const aiSuggestions = Array.isArray(ai.suggestions) ? ai.suggestions.filter((s) => SECTIONS.includes(s?.section)) : []
  const suggestions = checkSuggestions(aiSuggestions, scores, text, await knownSkillNames())

  // It had things to say but none were safe to show: try again rather than say the CV is perfect
  if (aiSuggestions.length && !suggestions.length) throw new Error('Every suggestion failed the checks')

  const strength = SECTIONS.reduce((sum, s) => sum + scores[s], 0)
  return {
    strength,
    potential: strength + suggestions.reduce((sum, s) => sum + s.points, 0),
    suggestions,
    comparison: {
      short_summary: ai.comparison?.short_summary === true,
      projects_with_tools: ai.comparison?.projects_with_tools === true,
      full_skill_names: ai.comparison?.full_skill_names === true,
      portfolio_link: hasWorkLink(text),
      relevant_courses: ai.comparison?.relevant_courses === true,
      one_page: isOnePage(rawText)
    }
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

const ANY_HEADING = /^(summary|profile|about me|objective|education|experience|work experience|projects?|skills|technical skills|languages|certificates|certifications|courses|hobbies|interests|references)\s*:?$/i

// A new section goes before the first heading, or at the end if there are none
function addSection(text, title, body) {
  if (title === 'Skills') return `${text}\n\n${title}\n${body}`
  const lines = text.split('\n')
  const first = lines.findIndex((line) => ANY_HEADING.test(line.trim()))
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

module.exports = { reviewCv, applySuggestions, cleanCvText, COMPARISON_LABELS, ANY_HEADING }
