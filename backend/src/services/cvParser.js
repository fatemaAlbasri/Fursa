const fs = require('fs/promises')
const path = require('path')
const { PDFParse } = require('pdf-parse')
const WordExtractor = require('word-extractor')
const db = require('../config/db')
const { extractWithAi, embedText, aiEnabled } = require('./cvAi')

// Same options as the dropdowns on the sign up page, so the form can be pre-filled
const MAJORS = ['Computer Science', 'Information Systems', 'Computer Engineering', 'Business', 'Accounting']
const STATUSES = ['Graduated', 'Final year student', 'Student']

// Matched on top of the names already in the skills table
const KNOWN_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB',
  'Python', 'Java', 'C#', 'C++', 'PHP', 'HTML', 'CSS', 'Git', 'Networking', 'Linux', 'Excel',
  'Power BI', 'Tableau', 'Data Analysis', 'Machine Learning', 'UI/UX Design', 'Figma',
  'Communication', 'Customer Service', 'Project Management', 'Accounting', 'English', 'Arabic'
]

const SPOKEN_LANGUAGES = [
  'English', 'Arabic', 'French', 'German', 'Spanish', 'Hindi', 'Urdu', 'Persian', 'Farsi',
  'Malayalam', 'Tamil', 'Tagalog', 'Filipino', 'Chinese', 'Mandarin', 'Turkish', 'Bengali'
]


// File → plain text
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  let text = ''
  if (ext === '.pdf') {
    const parser = new PDFParse({ data: await fs.readFile(filePath) })
    try {
      text = (await parser.getText()).text
    } finally {
      await parser.destroy()
    }
  } else if (ext === '.doc' || ext === '.docx') {
    text = (await new WordExtractor().extract(filePath)).getBody()
  }
  // Tidy spacing but keep line breaks (the rules below use them)
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}


// Rule-based parser (used when there is no API key or the AI call fails)
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hasWord = (text, word) =>
  new RegExp(`(^|[^A-Za-z0-9])${escapeRegex(word)}(?=$|[^A-Za-z0-9#+])`, 'i').test(text)

function findName(lines) {
  const line = lines
    .slice(0, 5)
    .find((l) => /^[A-Za-z][A-Za-z'.-]*(\s+[A-Za-z][A-Za-z'.-]*){1,3}$/.test(l) && !/curriculum|resume|cv\b/i.test(l))
  if (!line) return { firstName: null, lastName: null }
  const words = line.split(/\s+/).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
  return { firstName: words[0], lastName: words.slice(1).join(' ') }
}

// Bahrain mobile/landline: 8 digits, optionally after +973 / 00973
function findPhone(text) {
  const match = text.match(/(?:\+|00)?973[\s-]*((?:\d[\s-]*){8})|(?<!\d)([3613]\d{3}[\s-]?\d{4})(?!\d)/)
  if (!match) return null
  return (match[1] || match[2]).replace(/\D/g, '')
}

const MAJOR_KEYWORDS = [
  ['Computer Engineering', /computer engineering/i],
  ['Information Systems', /information (systems|technology)|\bMIS\b/i],
  ['Computer Science', /computer science|software engineering|cyber ?security|data science|artificial intelligence/i],
  ['Accounting', /accounting|accountancy|\bACCA\b|\bCPA\b/i],
  ['Business', /business|management|marketing|finance|economics|\bMBA\b/i]
]

function findMajor(text) {
  const found = MAJOR_KEYWORDS.find(([, regex]) => regex.test(text))
  if (found) return found[0]
  return /bachelor|\bB\.?Sc\b|\bBSc\b|degree|university/i.test(text) ? 'Other' : null
}

function findGraduationStatus(text) {
  const year = new Date().getFullYear()
  const expected = text.match(/expected[^\n]{0,40}?(20\d{2})|(20\d{2})\s*\(expected\)/i)
  if (expected) {
    const y = Number(expected[1] || expected[2])
    return y <= year + 1 ? 'Final year student' : 'Student'
  }
  if (/\bcurrently (studying|enrolled)|undergraduate student/i.test(text)) return 'Student'
  if (/bachelor|\bB\.?Sc\b|master|graduated/i.test(text)) return 'Graduated'
  return null
}

function findYears(text) {
  const match = text.match(/(\d+(?:\.\d)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:\w+\s+)?experience/i)
  return match ? Number(match[1]) : null
}

function parseWithRules(text, knownSkills) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  return {
    ...findName(lines),
    email: (text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [null])[0],
    phone: findPhone(text),
    major: findMajor(text),
    graduationStatus: findGraduationStatus(text),
    yearsExperience: findYears(text),
    skills: knownSkills.filter((skill) => hasWord(text, skill)),
    languages: SPOKEN_LANGUAGES.filter((lang) => hasWord(text, lang)),
    experience: []
  }
}


// Parse a CV file: AI first, rules as fallback
async function knownSkillNames() {
  const { rows } = await db.query('SELECT name FROM skills ORDER BY name')
  return [...new Set([...rows.map((r) => r.name), ...KNOWN_SKILLS])]
}

function normalize(info, knownSkills) {
  const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const list = (v) => [...new Set((Array.isArray(v) ? v : []).map(str).filter(Boolean))]
  const canonical = new Map(knownSkills.map((s) => [s.toLowerCase(), s]))
  const phone = str(info.phone)?.replace(/\D/g, '').replace(/^(00)?973/, '')
  const years = Number(info.yearsExperience)

  return {
    firstName: str(info.firstName),
    lastName: str(info.lastName),
    email: str(info.email)?.toLowerCase() || null,
    phone: phone && /^\d{8}$/.test(phone) ? phone : null,
    major: MAJORS.includes(info.major) ? info.major : null,
    graduationStatus: STATUSES.includes(info.graduationStatus) ? info.graduationStatus : null,
    yearsExperience:
      info.yearsExperience !== null && Number.isFinite(years) && years >= 0 && years < 100
        ? Math.round(years * 10) / 10
        : null,
    skills: [...new Set(list(info.skills).map((s) => canonical.get(s.toLowerCase()) || s))],
    languages: list(info.languages),
    experience: (Array.isArray(info.experience) ? info.experience : [])
      .filter((e) => e && str(e.title))
      .map((e) => ({ title: str(e.title), company: str(e.company), start: str(e.start), end: str(e.end) }))
  }
}

// Returns { text, info, source } where source is 'ai' or 'rules'.
async function parseCv(filePath) {
  let text
  try {
    text = await extractText(filePath)
  } catch (err) {
    console.error('CV text extraction failed:', err.message)
    text = ''
  }
  if (text.length < 30) {
    throw Object.assign(
      new Error("We couldn't read text from this CV. Please upload a PDF or Word file that isn't a scanned image."),
      { status: 422 }
    )
  }

  const knownSkills = await knownSkillNames()

  if (aiEnabled()) {
    try {
      const info = await extractWithAi(text, {
        majors: MAJORS,
        statuses: STATUSES,
        knownSkills,
        today: new Date().toISOString().slice(0, 10)
      })
      return { text, info: normalize(info, knownSkills), source: 'ai' }
    } catch (err) {
      console.error('AI CV parsing failed, using rules instead:', err.message)
    }
  }

  return { text, info: normalize(parseWithRules(text, knownSkills), knownSkills), source: 'rules' }
}


// Save the parsed CV on a resume row (and years of experience on the profile)
const experienceText = (experience) =>
  experience
    .map((e) => {
      const dates = [e.start, e.end].filter(Boolean).join(' - ')
      return [e.title, e.company && `at ${e.company}`, dates && `(${dates})`].filter(Boolean).join(' ')
    })
    .join('\n') || null

// If the embedding fails, the old CV's vector is cleared so the CV component is excluded
async function saveCvEmbedding(seekerId, text) {
  let vector = null
  if (text && aiEnabled()) {
    try {
      vector = await embedText(text)
    } catch (err) {
      console.error('CV embedding failed:', err.message)
    }
  }
  await db.query('UPDATE seeker_profiles SET cv_embedding = $1::vector WHERE user_id = $2', [vector, seekerId])
}

async function saveParsedCv(resumeId, seekerId, filePath) {
  const { text, info, source } = await parseCv(filePath)
  console.log(`CV ${resumeId} parsed with: ${source}`)
  await db.query(
    `UPDATE resumes SET parsed_text = $1, parsed_experience = $2, parsed_languages = $3 WHERE id = $4`,
    [text, experienceText(info.experience), info.languages.join(', ') || null, resumeId]
  )
  // The newest CV decides the years of experience used by matching
  if (info.yearsExperience !== null) {
    await db.query(
      `UPDATE seeker_profiles SET years_experience = $1 WHERE user_id = $2`,
      [info.yearsExperience, seekerId]
    )
  }
  await saveCvEmbedding(seekerId, text)
  return { info, source }
}

module.exports = { parseCv, saveParsedCv, saveCvEmbedding, knownSkillNames, hasWord, escapeRegex }
