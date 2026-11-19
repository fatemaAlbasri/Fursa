const path = require('path')
const db = require('../config/db')
const { inTransaction } = require('../config/transaction')
const { fileUrl, removeFiles, UPLOADS_DIR } = require('../middleware/upload')
const { rescoreSeeker } = require('../services/matching')
const { skillIds } = require('../services/skills')
const { isEmail, clean, toList, JOB_TYPES, WORK_MODES, pickList, toPhone } = require('../utils/fields')

const fieldErrors = (res, fields) =>
  res.status(400).json({ error: 'Please fix the highlighted fields', fields })

// Email / company name already used by someone else
const duplicateError = (err, res) => {
  if (err.code !== '23505') return false
  if (err.constraint === 'users_email_key') {
    res.status(409).json({ error: 'An account with this email already exists', fields: { email: 'Already registered' } })
    return true
  }
  if (err.constraint === 'companies_name_key') {
    res.status(409).json({ error: 'A company with this name already exists', fields: { companyName: 'Already registered' } })
    return true
  }
  return false
}

// Matches depend on skills, major, experience and preferences → score again after answering
const rescoreLater = (userId) =>
  rescoreSeeker(userId).catch((err) => console.error('Scoring after profile edit failed:', err.message))

// First name, last name, email (seeker "Personal details" and company "HR contact")
const checkAccount = (body, errors) => {
  const firstName = clean(body.firstName)
  const lastName = clean(body.lastName)
  const email = clean(body.email).toLowerCase()
  if (!firstName) errors.firstName = 'Required'
  else if (firstName.length > 50) errors.firstName = 'Too long'
  if (!lastName) errors.lastName = 'Required'
  else if (lastName.length > 50) errors.lastName = 'Too long'
  if (!isEmail(email)) errors.email = 'Enter a valid email'
  return { firstName, lastName, email }
}

const saveAccount = (client, userId, a) =>
  client.query(
    'UPDATE users SET first_name = $2, last_name = $3, email = $4 WHERE id = $1',
    [userId, a.firstName, a.lastName, a.email]
  )

// GET /api/profile (seeker + company) 
const getProfile = async (req, res, next) => {
  try {
    const id = req.user.id
    const { rows: users } = await db.query(
      'SELECT id, first_name, last_name, email, role, created_at FROM users WHERE id = $1',
      [id]
    )
    if (!users[0]) return res.status(404).json({ error: 'Account not found' })
    const user = users[0]

    if (user.role === 'employer') {
      const { rows } = await db.query(
        `SELECT id, name, logo_url, website, industry, location, phone, about
           FROM companies WHERE user_id = $1`,
        [id]
      )
      return res.json({ profile: { ...user, company: rows[0] || null } })
    }

    const [{ rows: p }, { rows: skills }, { rows: cv }] = await Promise.all([
      db.query(
        `SELECT phone, major, graduation_status, years_experience, job_types, work_modes
           FROM seeker_profiles WHERE user_id = $1`,
        [id]
      ),
      db.query(
        `SELECT s.id, s.name FROM seeker_skills ss
           JOIN skills s ON s.id = ss.skill_id
          WHERE ss.seeker_id = $1 ORDER BY s.name`,
        [id]
      ),
      db.query(
        `SELECT id, file_name, file_url, uploaded_at FROM resumes
          WHERE seeker_id = $1 AND is_current`,
        [id]
      )
    ])
    const seeker = p[0] || {}
    res.json({
      profile: {
        ...user,
        ...seeker,
        years_experience: seeker.years_experience == null ? null : Number(seeker.years_experience),
        skills,
        cv: cv[0] || null
      }
    })
  } catch (err) {
    next(err)
  }
}

// PUT /api/profile/seeker/details
// { firstName, lastName, email, phone, major, graduationStatus, yearsExperience? }
const updateSeekerDetails = async (req, res, next) => {
  const body = req.body || {}
  const errors = {}
  const account = checkAccount(body, errors)

  const p = toPhone(body.phone)
  if (p.error) errors.phone = p.error

  const major = clean(body.major)
  if (!major) errors.major = 'Required'
  else if (major.length > 100) errors.major = 'Too long'

  const graduationStatus = clean(body.graduationStatus)
  if (!graduationStatus) errors.graduationStatus = 'Required'
  else if (graduationStatus.length > 30) errors.graduationStatus = 'Too long'

  // empty = unknown (left out of the match score)
  let years = null
  if (body.yearsExperience !== undefined && body.yearsExperience !== null && body.yearsExperience !== '') {
    years = Number(body.yearsExperience)
    if (!Number.isFinite(years) || years < 0 || years > 50) errors.yearsExperience = 'Enter a number from 0 to 50'
  }

  if (Object.keys(errors).length) return fieldErrors(res, errors)

  try {
    await inTransaction(async (client) => {
      await saveAccount(client, req.user.id, account)
      await client.query(
        `UPDATE seeker_profiles
            SET phone = $2, major = $3, graduation_status = $4, years_experience = $5
          WHERE user_id = $1`,
        [req.user.id, p.phone, major, graduationStatus, years]
      )
    })
    res.json({ message: 'Profile saved' })
    rescoreLater(req.user.id)
  } catch (err) {
    if (duplicateError(err, res)) return
    next(err)
  }
}

// PUT /api/profile/seeker/skills { skills: ['React', 'SQL'] }
const updateSeekerSkills = async (req, res, next) => {
  const skills = [...new Set(toList(req.body?.skills).map(clean).filter(Boolean))]
  if (skills.length === 0) return fieldErrors(res, { skills: 'Pick at least one skill' })
  if (skills.length > 50) return fieldErrors(res, { skills: 'Too many skills (max 50)' })
  if (skills.some((s) => s.length > 60)) return fieldErrors(res, { skills: 'A skill name is too long' })

  try {
    const saved = await inTransaction(async (client) => {
      const ids = await skillIds(client, skills)
      // replace the seeker's skills with the new list
      await client.query('DELETE FROM seeker_skills WHERE seeker_id = $1', [req.user.id])
      await client.query(
        `INSERT INTO seeker_skills (seeker_id, skill_id) SELECT $1, unnest($2::int[])`,
        [req.user.id, ids]
      )
      const { rows } = await client.query(
        `SELECT s.id, s.name FROM seeker_skills ss JOIN skills s ON s.id = ss.skill_id
          WHERE ss.seeker_id = $1 ORDER BY s.name`,
        [req.user.id]
      )
      return rows
    })
    res.json({ skills: saved })
    rescoreLater(req.user.id)
  } catch (err) {
    next(err)
  }
}

// PUT /api/profile/seeker/preferences 
const updateSeekerPreferences = async (req, res, next) => {
  try {
    const jobTypes = pickList(req.body?.jobTypes, JOB_TYPES)
    const workModes = pickList(req.body?.workModes, WORK_MODES)
    await db.query(
      'UPDATE seeker_profiles SET job_types = $2, work_modes = $3 WHERE user_id = $1',
      [req.user.id, jobTypes, workModes]
    )
    res.json({ job_types: jobTypes, work_modes: workModes })
    rescoreLater(req.user.id)
  } catch (err) {
    next(err)
  }
}

// PUT /api/profile/company/details
// { companyName, industry, location, website?, phone?, about? }
const updateCompanyDetails = async (req, res, next) => {
  const body = req.body || {}
  const errors = {}

  const name = clean(body.companyName)
  if (!name) errors.companyName = 'Required'
  else if (name.length > 150) errors.companyName = 'Too long'

  const industry = clean(body.industry)
  if (!industry) errors.industry = 'Required'
  else if (industry.length > 100) errors.industry = 'Too long'

  const location = clean(body.location)
  if (!location) errors.location = 'Required'
  else if (location.length > 100) errors.location = 'Too long'

  const website = clean(body.website)
  if (website && !/^https?:\/\/\S+\.\S+/.test(website)) errors.website = 'Start with https://'
  else if (website.length > 255) errors.website = 'Too long'

  const p = toPhone(body.phone)
  if (p.error) errors.phone = p.error

  const about = clean(body.about)
  if (about.length > 2000) errors.about = 'Too long (max 2000 characters)'

  if (Object.keys(errors).length) return fieldErrors(res, errors)

  try {
    const { rows } = await db.query(
      `UPDATE companies
          SET name = $2, industry = $3, location = $4, website = $5, phone = $6, about = $7
        WHERE user_id = $1
        RETURNING id, name, logo_url, website, industry, location, phone, about`,
      [req.user.id, name, industry, location, website || null, p.phone, about || null]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Company not found' })
    res.json({ company: rows[0] })
  } catch (err) {
    if (duplicateError(err, res)) return
    next(err)
  }
}

// PUT /api/profile/company/logo  FormData { logo } 
const updateCompanyLogo = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Choose an image for the logo' })
  try {
    const { rows } = await db.query('SELECT logo_url FROM companies WHERE user_id = $1', [req.user.id])
    if (!rows[0]) {
      removeFiles([req.file])
      return res.status(404).json({ error: 'Company not found' })
    }

    const logoUrl = fileUrl(req.file)
    await db.query('UPDATE companies SET logo_url = $2 WHERE user_id = $1', [req.user.id, logoUrl])

    // delete the old logo file 
    const old = rows[0].logo_url
    if (old && old.startsWith('/uploads/logos/')) {
      removeFiles([{ path: path.join(UPLOADS_DIR, 'logos', path.basename(old)) }])
    }
    res.json({ logo_url: logoUrl })
  } catch (err) {
    removeFiles([req.file])
    next(err)
  }
}

// PUT /api/profile/company/contact { firstName, lastName, email } 
const updateCompanyContact = async (req, res, next) => {
  const errors = {}
  const account = checkAccount(req.body || {}, errors)
  if (Object.keys(errors).length) return fieldErrors(res, errors)

  try {
    await saveAccount(db, req.user.id, account)
    res.json({ first_name: account.firstName, last_name: account.lastName, email: account.email })
  } catch (err) {
    if (duplicateError(err, res)) return
    next(err)
  }
}

module.exports = {
  getProfile,
  updateSeekerDetails,
  updateSeekerSkills,
  updateSeekerPreferences,
  updateCompanyDetails,
  updateCompanyLogo,
  updateCompanyContact
}
