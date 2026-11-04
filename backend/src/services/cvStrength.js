const { hasWord } = require('./cvParser')

// CV strength: fixed rules, so the same text always gets the same score.
// Each section is marked out of these points (they add up to 100)
const SECTION_MAX = { summary: 15, projects: 40, skills: 20, education: 15, layout: 10 }

const HEADINGS = {
  summary: ['summary', 'professional summary', 'profile', 'about', 'about me', 'objective', 'career objective'],
  projects: [
    'experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history',
    'internships', 'projects', 'project', 'academic projects', 'personal projects'
  ],
  skills: ['skills', 'technical skills', 'key skills', 'core skills', 'tools', 'technologies'],
  education: ['education', 'academic background', 'qualifications'],
  low: ['hobbies', 'interests', 'references'],
  other: ['languages', 'certificates', 'certifications', 'courses', 'relevant courses', 'activities', 'volunteering', 'awards']
}

const headingText = (line) => line.trim().replace(/:$/, '').trim().toLowerCase()
const headingType = (line) =>
  Object.keys(HEADINGS).find((type) => HEADINGS[type].includes(headingText(line))) || null
// A heading the rules don't know, such as TIMELINE: a short line in capitals
const looksLikeHeading = (line) => /^[A-Z][A-Z &/]{5,29}:?$/.test(line.trim()) && line.trim().split(/\s+/).length <= 3
const isHeading = (line) => headingType(line) !== null || looksLikeHeading(line)

// Short forms that mean the same skill
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
const SHORT_FORMS = new Set(Object.values(SAME_SKILL).flat())

const VAGUE_SUMMARY = /(looking for|seeking)\s+(a |an )?(job|work|position|opportunit)|hard.?working|highly motivated|team player|fast learner/i
const FIELD_WORDS = /\b(computer science|information (systems|technology)|computer engineering|software|business|accounting|finance|marketing|engineering|graduate|student)\b/i
const ACTION_VERB = /^(built|developed|designed|implemented|created|wrote|led|managed|improved|fixed|used|tested|deployed|analy[sz]ed|automated|maintained|delivered|organi[sz]ed|prepared|supported|launched|reduced|increased|integrated|configured|researched|resolved|inspected|installed|repaired|troubleshot|monitored|documented|coordinated|trained|presented|conducted)\b/i
const EDUCATION_LINE = /\b(bsc|b\.sc|msc|m\.sc|mba|phd|bachelor|master|diploma|university|college|polytechnic)\b|^study\b/i
const EXPERIENCE_LINE = /\b(intern|internship|assistant|developer|engineer|technician|officer|analyst|consultant|accountant|cashier|supervisor|part-time|full-time)\b/i
const BULLET = /^[•\-*–▪·]\s*/
const DEGREE = /\b(bsc|b\.sc|ba|msc|m\.sc|mba|phd|bachelor|master|diploma|degree)\b/i
const YEAR = /\b(19|20)\d{2}\b/
const COURSES = /\b(courses|coursework|modules)\b/i
const DATE = /\b(19|20)\d{2}([-/]\d{1,2})?\b|\b\d{1,2}[-/](19|20)\d{2}\b/g

// What a line is about when its heading doesn't say, so a TIMELINE section still counts as experience and education.
// The top of the CV is only read for education: a job title there is what they want, not what they have done
function lineType(line, underUnknownHeading) {
  if (line.includes('@') || /^i\b/i.test(line)) return null
  if (EDUCATION_LINE.test(line)) return 'education'
  if (underUnknownHeading && EXPERIENCE_LINE.test(line)) return 'projects'
  return null
}

function splitSections(text) {
  const sections = { summary: [], projects: [], skills: [], education: [], low: [], other: [] }
  const order = []
  let hasExperience = false
  let current = null
  let lastGuess = null
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  lines.forEach((line, i) => {
    const known = headingType(line)
    if (known || (i > 0 && looksLikeHeading(line))) {
      current = known
      lastGuess = null
      order.push({ type: known || 'unknown', text: headingText(line) })
      if (known === 'projects' && isExperienceHeading({ type: known, text: headingText(line) })) hasExperience = true
    } else if (current) {
      sections[current].push(line)
    } else if (i > 0) {
      // A bullet belongs with the line above it
      const underUnknownHeading = order.length > 0
      lastGuess = BULLET.test(line) ? lastGuess : lineType(line, underUnknownHeading)
      if (lastGuess) sections[lastGuess].push(line)
      if (lastGuess === 'projects') hasExperience = true
    }
  })
  return { sections, order, hasExperience }
}

function scoreSummary(lines, knownSkills) {
  const text = lines.join(' ')
  const words = text.split(/\s+/).filter(Boolean).length
  const present = lines.length > 0
  const goodLength = words >= 10 && words <= 60
  const notVague = present && !VAGUE_SUMMARY.test(text)
  const specific = FIELD_WORDS.test(text) && knownSkills.some((s) => hasWord(text, s))
  return {
    score: (present ? 4 : 0) + (goodLength ? 3 : 0) + (notVague ? 4 : 0) + (specific ? 4 : 0),
    met: present && goodLength && notVague && specific
  }
}

const isExperienceHeading = (h) => h.type === 'projects' && /experience|employment|work|intern/.test(h.text)

// Bullet points if it has them; otherwise the longer lines that aren't job titles with dates
function projectEntries(lines) {
  const bullets = lines.filter((l) => BULLET.test(l))
  return bullets.length ? bullets : lines.filter((l) => l.split(/\s+/).length >= 6 && !YEAR.test(l))
}
const startsWithVerb = (line) => ACTION_VERB.test(line.replace(BULLET, ''))

// Numbers that show a result (20+ shops), not dates (2025, 2025-06)
const countResults = (text) => (text.replace(DATE, ' ').match(/\d+(?:[.,]\d+)?/g) || []).length

function scoreProjects(lines, knownSkills, hasExperience) {
  if (!lines.length) return { score: 0, met: false }
  const text = lines.join(' ')
  const tools = knownSkills.filter((s) => hasWord(text, s)).length

  const entries = projectEntries(lines)
  const withVerb = entries.filter(startsWithVerb).length
  const verbShare = entries.length ? withVerb / entries.length : 0

  const results = countResults(text)

  return {
    score:
      5 +
      (hasExperience ? 8 : 0) +
      (tools >= 3 ? 7 : tools >= 1 ? 3 : 0) +
      Math.round(verbShare * 10) +
      (results >= 2 ? 10 : results === 1 ? 5 : 0),
    met: tools >= 1
  }
}

const skillItems = (lines) =>
  lines
    .join(',')
    .split(/[,·•|;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)

function isBadlyWritten(item, knownSkills) {
  const lower = item.toLowerCase()
  if (SHORT_FORMS.has(lower)) return true
  // Lower case only ("react"): "Customer service" is a fine way to write "Customer Service"
  return item === lower && knownSkills.some((s) => s.toLowerCase() === lower && s !== item)
}

function scoreSkills(lines, knownSkills) {
  if (!lines.length) return { score: 0, met: false }
  const items = skillItems(lines)
  const fullNames = !items.some((item) => isBadlyWritten(item, knownSkills))
  return {
    score: 3 + (items.length >= 8 ? 10 : items.length >= 5 ? 7 : items.length >= 3 ? 3 : 0) + (fullNames ? 7 : 0),
    met: fullNames
  }
}

function scoreEducation(lines, allText) {
  const courses = COURSES.test(allText)
  if (!lines.length) return { score: 0, courses }
  const text = lines.join(' ')
  return {
    score: 3 + (DEGREE.test(text) ? 3 : 0) + (YEAR.test(text) ? 3 : 0) + (courses ? 6 : 0),
    courses
  }
}

function scoreLayout(order, sections, onePage) {
  const experience = order.findIndex(isExperienceHeading)
  const education = order.findIndex((h) => h.type === 'education')
  const summaryFirst = order.findIndex((h) => h.type === 'summary') === 0
  const experienceAbove = experience === -1 || education === -1 || experience < education
  return (
    (order.length >= 3 ? 3 : 0) +
    (onePage ? 3 : 0) +
    (summaryFirst ? 2 : 0) +
    (experienceAbove ? 1 : 0) +
    (sections.low.length ? 0 : 1)
  )
}

// Returns { total, scores, comparison }. The two comparison items that need the original file are added by the caller
function scoreCv(text, { knownSkills, onePage }) {
  const { sections, order, hasExperience } = splitSections(text)
  const summary = scoreSummary(sections.summary, knownSkills)
  const projects = scoreProjects(sections.projects, knownSkills, hasExperience)
  const skills = scoreSkills(sections.skills, knownSkills)
  const education = scoreEducation(sections.education, text)
  const layout = scoreLayout(order, sections, onePage)

  const scores = {
    summary: summary.score,
    projects: projects.score,
    skills: skills.score,
    education: education.score,
    layout
  }
  return {
    total: Object.values(scores).reduce((sum, n) => sum + n, 0),
    scores,
    comparison: {
      short_summary: summary.met,
      projects_with_tools: projects.met,
      full_skill_names: skills.met,
      relevant_courses: education.courses
    }
  }
}

// The problems in this CV that rewording can fix. Gemini is told to fix each one, so the feedback
// doesn't depend on what it happens to notice. Missing facts (courses, results) aren't listed: they can't be reworded in
function findIssues(text, { knownSkills }) {
  const { sections, order } = splitSections(text)
  const issues = []
  const add = (section, problem) => issues.push({ section, problem })

  const summary = sections.summary.join(' ')
  const toolsUsed = knownSkills.filter((s) => hasWord(sections.projects.join(' '), s))
  if (!summary) {
    add('summary', "The CV has no summary section. Write one from its facts. If a line already says what they do or want, use that line as before; otherwise leave before empty.")
  } else {
    const words = summary.split(/\s+/).length
    if (VAGUE_SUMMARY.test(summary)) add('summary', `The summary is vague: "${summary}"`)
    else if (words < 10) add('summary', `The summary is too short to say anything specific: "${summary}"`)
    else if (toolsUsed.length && !knownSkills.some((s) => hasWord(summary, s))) {
      add('summary', `The summary names no tools, though the CV mentions ${toolsUsed.join(', ')}: "${summary}"`)
    }
  }

  for (const line of projectEntries(sections.projects)) {
    if (!startsWithVerb(line)) add('projects', `This line doesn't start with a strong verb: "${line}"`)
  }

  const skillsText = sections.skills.join(' ')
  const notListed = toolsUsed.filter((s) => !hasWord(skillsText, s) && !isListedShort(s, skillsText))
  if (!sections.skills.length) {
    if (toolsUsed.length) add('skills', `The CV has no skills section, though it mentions ${toolsUsed.join(', ')}. Write one, with before left empty.`)
  } else {
    const badlyWritten = skillItems(sections.skills).filter((item) => isBadlyWritten(item, knownSkills))
    if (badlyWritten.length) add('skills', `These skills need their full, standard names: ${badlyWritten.join(', ')}`)
    if (notListed.length) add('skills', `The CV mentions these tools but its skills section doesn't list them: ${notListed.join(', ')}`)
  }

  const experience = order.findIndex(isExperienceHeading)
  const education = order.findIndex((h) => h.type === 'education')
  const summaryAt = order.findIndex((h) => h.type === 'summary')
  if (summaryAt > 0) add('layout', 'The summary should be the first section.')
  if (experience !== -1 && education !== -1 && experience > education) add('layout', 'Experience should be above education.')
  return issues
}

// What only the job seeker can add, because rewording can't invent it. The points come from the same rules as the score
function findMissing(text, { knownSkills, onePage, hasLink }) {
  const { sections, order, hasExperience } = splitSections(text)
  const missing = []
  const add = (section, advice, points) => missing.push({ section, advice, points })

  if (!sections.projects.length) {
    add('projects', 'Add your projects or coursework: what you built, the tools you used and the result.', 32)
  } else {
    const projects = sections.projects.join(' ')
    const tools = knownSkills.filter((s) => hasWord(projects, s)).length
    const results = countResults(projects)
    if (tools < 3) add('projects', 'Name the tools you used in your projects and work.', tools >= 1 ? 4 : 7)
    if (results < 2) add('projects', 'Add numbers that show your results, such as how many people used your work.', results === 1 ? 5 : 10)
  }
  if (!hasExperience) {
    add('projects', 'If you have done an internship, part-time or volunteer work, add it under an Experience heading.', 8)
  }

  if (!sections.skills.length) {
    add('skills', 'Add a Skills section listing the tools and skills you really have, with their full names.', 20)
  } else {
    const count = skillItems(sections.skills).length
    if (count < 8) add('skills', 'List more of the skills you really have. Eight or more gets full marks.', count >= 5 ? 3 : count >= 3 ? 7 : 10)
  }

  if (!sections.education.length) {
    add('education', 'Add an Education section with your degree, university, graduation year and relevant courses.', 15)
  } else {
    const education = sections.education.join(' ')
    if (!DEGREE.test(education)) add('education', 'Write your degree under Education, such as BSc Computer Science.', 3)
    if (!YEAR.test(education)) add('education', 'Write your graduation year, or expected year, under Education.', 3)
    if (!COURSES.test(text)) add('education', 'List the relevant courses you have taken under Education.', 6)
  }

  if (order.length < 3) add('layout', 'Use clear section headings, such as Summary, Experience, Projects, Skills and Education.', 3)
  if (!onePage) add('layout', 'Shorten your CV to one page.', 3)
  if (sections.low.length) add('layout', 'Remove sections that employers don\'t need, such as hobbies and references.', 1)
  if (!hasLink) add('projects', 'If you have a GitHub or portfolio, add a link to it.', 0)

  return missing.sort((a, b) => b.points - a.points)
}

// "JS" in the skills list counts as listing JavaScript
function isListedShort(skill, skillsText) {
  return (SAME_SKILL[skill.toLowerCase()] || []).some((short) => hasWord(skillsText, short))
}

module.exports = { scoreCv, findIssues, findMissing, isHeading, headingType, SECTION_MAX, SAME_SKILL }
