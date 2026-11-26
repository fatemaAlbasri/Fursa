const { reviewCvWithAi } = require('./cvAi')
const { knownSkillNames, hasWord, escapeRegex } = require('./cvParser')
const { scoreCv, findIssues, findMissing, isHeading, headingType, SECTION_MAX, SAME_SKILL } = require('./cvStrength')

const SECTIONS = Object.keys(SECTION_MAX)
const LAYOUT_SEPARATOR = /\s*(?:>|→|\n)\s*/

const COMPARISON_LABELS = {
  short_summary: 'A short, specific summary',
  projects_with_tools: 'Projects with the tools used',
  full_skill_names: 'Real skills, written in full names',
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
function findAddedFact(after, section, cvText, knownSkills, before = '') {
  const skillIsIn = (text, skill) => {
    const shortForms = SAME_SKILL[skill.toLowerCase()] || []
    return [skill, ...shortForms].some((name) => hasWord(text, name))
  }
  const skillIsInCv = (skill) => skillIsIn(cvText, skill)

  // A project line may only name the tools it already names: the skills list doesn't say where each tool was used
  if (section === 'projects') {
    const claimed = knownSkills.find((s) => hasWord(after, s) && !skillIsIn(before, s))
    if (claimed) return claimed
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

  // Compared as whole numbers, so 300+ in the CV counts as 300 but 30 doesn't
  const findNumbers = (value) => value.match(/\d+(?:[.,]\d+)*/g) || []
  const cvNumbers = new Set(findNumbers(cvText))
  const number = findNumbers(after).find((n) => !cvNumbers.has(n))
  if (number) return number

  // Student or graduate has to match what the CV says, though "finished university" can become graduate
  if (hasWord(after, 'student') && !hasWord(cvText, 'student')) return 'student'
  if (hasWord(after, 'graduate') && hasWord(cvText, 'student') && !hasWord(cvText, 'graduate')) return 'graduate'

  const skill = knownSkills.find((s) => hasWord(after, s) && !skillIsInCv(s))
  if (skill) return skill

  // Hyphens split words, so "JavaScript-based" is checked as "JavaScript" and "based"
  const words = [...after.matchAll(/[A-Za-z][A-Za-z0-9+#]*(?:[./][A-Za-z0-9+#]+)*/g)]
  for (const { 0: word, index } of words) {
    if (isInCv(word)) continue
    // A skills list is only names, so every word has to come from the CV
    if (section === 'skills' && !/^(and|courses|skills)$/i.test(word)) return word
    // Elsewhere, look for names: a capital mid-sentence, or an odd one anywhere (AWS, GraphQL)
    const before = after.slice(0, index)
    const startsSentence = index === 0 || /[.:!?·•\n(]\s*$/.test(before) || /(^|\n)\s*[-–*▪]\s*$/.test(before)
    const oddCapitals = /[A-Z0-9]/.test(word.slice(1))
    if (oddCapitals || (/^[A-Z]/.test(word) && !startsSentence)) return word
  }
  return null
}

const drop = (s, why) => console.warn(`CV suggestion dropped (${s.section}): ${why}`)
const HELPING = /\b(helped|assisted|supported|contributed)\b/i
const LINE_BULLET = /^[•\-*–▪·]\s*/

// Keeps only suggestions we can stand behind
function checkSuggestions(aiSuggestions, cvText, knownSkills) {
  const taken = []
  const kept = []

  const ranked = [...aiSuggestions].sort((a, b) => SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section))
  for (const s of ranked) {
    let after = (s.after || '').trim()
    const reason = (s.reason || '').trim()
    let before = (s.before || '').trim()
    if (!after || !reason) { drop(s, 'empty'); continue }

    if (s.section === 'layout') {
      if (kept.some((k) => k.section === 'layout')) { drop(s, 'second layout change'); continue }
      if (!validLayout(cvText, before, after)) { drop(s, 'not a reorder of the CV headings'); continue }
    } else {
      const added = findAddedFact(after, s.section, cvText, knownSkills, before)
      if (added) { drop(s, `adds "${added}", which is not in the CV`); continue }
      // "Helped configure routers" can't become "Configured routers": that claims more than they did
      if (HELPING.test(before) && !HELPING.test(after)) { drop(s, 'makes helping sound like doing it alone'); continue }

      if (before) {
        const found = findInCv(cvText, before)
        if (!found) { drop(s, 'before text is not in the CV'); continue }
        if (taken.some((t) => found.start < t.end && t.start < found.end)) { drop(s, 'overlaps another'); continue }
        if (found.text.toLowerCase() === after.toLowerCase()) { drop(s, 'changes nothing'); continue }
        taken.push(found)
        before = found.text // exact wording, so the frontend can highlight it
        // Keep the line's bullet, which Gemini often leaves out
        const bullet = before.match(LINE_BULLET)
        if (bullet && !LINE_BULLET.test(after)) after = bullet[0] + after
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
  const onePage = isOnePage(rawText)
  const scoreOptions = { knownSkills, onePage }
  const issues = findIssues(text, scoreOptions)
  const aiOptions = { major, issues, today: new Date().toISOString().slice(0, 10) }

  // When there are problems to fix but none came back, ask once more
  let aiSuggestions = []
  let checked = []
  for (let attempt = 0; attempt < 2 && !checked.length; attempt++) {
    const ai = await reviewCvWithAi(text, aiOptions)
    aiSuggestions = Array.isArray(ai.suggestions) ? ai.suggestions.filter((s) => SECTIONS.includes(s?.section)) : []
    checked = checkSuggestions(aiSuggestions, text, knownSkills)
    if (!issues.length && !aiSuggestions.length) break
  }

  // Never save a review that wrongly says the CV has nothing to improve
  if ((issues.length || aiSuggestions.length) && !checked.length) throw new Error('No usable suggestions came back')

  const current = scoreCv(text, scoreOptions)
  const suggestions = addPoints(checked, text, current.total, scoreOptions)
  console.log(`CV review: ${issues.length} problems found, ${aiSuggestions.length} suggestions written, ${suggestions.length} kept`)
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
  // Every section ends at the next heading, so moving two of them doesn't drag the sections after them along
  const starts = lines
    .map((line, i) => (i > 0 && (isHeading(line) || from.includes(key(line))) ? i : -1))
    .filter((i) => i !== -1)
  const sections = starts.map((start, i) => lines.slice(start, starts[i + 1]).join('\n').trim())
  const headingOf = (section) => key(section.split('\n')[0])
  const listed = sections.filter((s) => from.includes(headingOf(s)))
  if (listed.length !== from.length) return text

  // The listed sections swap places in the new order; the others stay where they are
  const byHeading = new Map(listed.map((s) => [headingOf(s), s]))
  const order = splitLayout(after).map((h) => byHeading.get(h.toLowerCase()))
  let next = 0
  const reordered = sections.map((s) => (from.includes(headingOf(s)) ? order[next++] : s))
  const top = lines.slice(0, starts[0]).join('\n').trim()
  return [top, ...reordered].filter(Boolean).join('\n\n')
}

// A new section goes before the first heading, or at the end if there are none
function addSection(text, title, body) {
  if (title === 'Skills') return `${text}\n\n${title}\n${body}`
  const lines = text.split('\n')
  const first = lines.findIndex((line, i) => i > 0 && isHeading(line))
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
    if (!found) continue
    // A line that becomes the summary needs a heading if the CV has none
    const needsHeading = s.section === 'summary' && !text.split('\n').some((line) => headingType(line) === 'summary')
    text = text.slice(0, found.start) + (needsHeading ? 'Summary\n' : '') + s.after_text + text.slice(found.end)
  }
  const layout = accepted.find((s) => s.section === 'layout')
  return layout ? moveSections(text, layout.before_text, layout.after_text) : text
}

async function scoreAcceptedSuggestions(rawText, suggestions) {
  const text = applySuggestions(rawText, suggestions)

  return scoreCv(text, {
    knownSkills: await knownSkillNames(),
    onePage: isOnePage(rawText)
  }).total
}

// What the seeker has to add themselves. Worked out from the CV each time, so it needs no AI and isn't saved
async function missingContent(rawText) {
  const text = cleanCvText(rawText)
  return findMissing(text, {
    knownSkills: await knownSkillNames(),
    onePage: isOnePage(rawText),
    hasLink: hasWorkLink(text)
  })
}

// The CV once every suggestion is used: what is still missing and how it compares.
// The report shows these next to the "after all changes" score, so they must not ask for what a rewrite already adds
async function afterAllChanges(rawText, suggestions) {
  const text = applySuggestions(rawText, suggestions.map((s) => ({ ...s, status: 'accepted' })))
  const knownSkills = await knownSkillNames()
  const onePage = isOnePage(rawText)
  const hasLink = hasWorkLink(text)
  return {
    missing: findMissing(text, { knownSkills, onePage, hasLink }),
    comparison: { ...scoreCv(text, { knownSkills, onePage }).comparison, portfolio_link: hasLink, one_page: onePage }
  }
}

// The score the CV can reach: every rewrite, plus what only the job seeker can add.
// Each tip's points are its best case ("up to +20"), and people rarely get every tip in full,
// so only part of them counts, and no CV is shown as reaching more than REACH_MAX.
// Never lower than the score after the rewrites.
const REACH_SHARE = 0.8
const REACH_MAX = 98
const reachableScore = (potential, missingAfter) => {
  const tips = missingAfter.reduce((sum, m) => sum + (m.points || 0), 0)
  return Math.max(potential, Math.min(REACH_MAX, potential + Math.round(tips * REACH_SHARE)))
}

module.exports = { reviewCv, applySuggestions, missingContent, afterAllChanges, reachableScore, cleanCvText, COMPARISON_LABELS, scoreAcceptedSuggestions }
