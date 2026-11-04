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
const isHeading = (line) => headingType(line) !== null

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
const ACTION_VERB = /^(built|developed|designed|implemented|created|wrote|led|managed|improved|fixed|used|tested|deployed|analy[sz]ed|automated|maintained|delivered|organi[sz]ed|prepared|supported|launched|reduced|increased|integrated|configured|researched)\b/i
const BULLET = /^[•\-*–▪·]\s*/
const DEGREE = /\b(bsc|b\.sc|ba|msc|m\.sc|mba|phd|bachelor|master|diploma|degree)\b/i
const YEAR = /\b(19|20)\d{2}\b/
const COURSES = /\b(courses|coursework|modules)\b/i
const DATE = /\b(19|20)\d{2}([-/]\d{1,2})?\b|\b\d{1,2}[-/](19|20)\d{2}\b/g

function splitSections(text) {
  const sections = { summary: [], projects: [], skills: [], education: [], low: [], other: [] }
  const order = []
  let current = null
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const type = headingType(line)
    if (type) {
      current = type
      order.push({ type, text: headingText(line) })
    } else if (current) {
      sections[current].push(line)
    }
  }
  return { sections, order }
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

function scoreProjects(lines, knownSkills, hasExperience) {
  if (!lines.length) return { score: 0, met: false }
  const text = lines.join(' ')
  const tools = knownSkills.filter((s) => hasWord(text, s)).length

  // Bullet points if it has them; otherwise the longer lines that aren't job titles with dates
  const bullets = lines.filter((l) => BULLET.test(l))
  const entries = bullets.length ? bullets : lines.filter((l) => l.split(/\s+/).length >= 6 && !YEAR.test(l))
  const withVerb = entries.filter((l) => ACTION_VERB.test(l.replace(BULLET, ''))).length
  const verbShare = entries.length ? withVerb / entries.length : 0

  // Numbers that show a result (20+ shops), not dates (2025, 2025-06)
  const results = (text.replace(DATE, ' ').match(/\d+(?:[.,]\d+)?/g) || []).length

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

function scoreSkills(lines, knownSkills) {
  if (!lines.length) return { score: 0, met: false }
  const items = lines
    .join(',')
    .split(/[,·•|;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const spelling = new Map(knownSkills.map((s) => [s.toLowerCase(), s]))
  const fullNames = items.every((item) => {
    const lower = item.toLowerCase()
    if (SHORT_FORMS.has(lower)) return false
    return !spelling.has(lower) || spelling.get(lower) === item
  })
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
  const { sections, order } = splitSections(text)
  const summary = scoreSummary(sections.summary, knownSkills)
  const projects = scoreProjects(sections.projects, knownSkills, order.some(isExperienceHeading))
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

module.exports = { scoreCv, isHeading, SECTION_MAX, SAME_SKILL }
