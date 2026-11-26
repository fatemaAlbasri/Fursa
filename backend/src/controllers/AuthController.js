const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const db = require('../config/db')
const { sendMail } = require('../config/mailer')
const { signToken } = require('../middleware/auth')
const { fileUrl, removeFiles } = require('../middleware/upload')
const { saveParsedCv } = require('../services/cvParser')
const { rescoreSeeker } = require('../services/matching')
const { skillIds } = require('../services/skills')
const { isEmail, clean, toList, JOB_TYPES, WORK_MODES, pickList, toPhone } = require('../utils/fields')
const { PAYMENT_METHODS, PLAN_COLUMNS, paymentOut, startSubscription, emailReceipt } = require('../services/planPayment')

// The frontend says 'jobseeker' / 'company', the database says 'seeker' / 'employer'
const ROLES = {
  jobseeker: 'seeker',
  seeker: 'seeker',
  company: 'employer',
  employer: 'employer'
}

// Public user info returned to the frontend (never the password hash)
async function loadUser(id) {
  const { rows } = await db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.role, c.id AS company_id, c.name AS company_name
       FROM users u
       LEFT JOIN companies c ON c.user_id = u.id
      WHERE u.id = $1`,
    [id]
  )
  if (!rows[0]) return null
  const { company_id, company_name, ...user } = rows[0]
  return user.role === 'employer'
    ? { ...user, company: { id: company_id, name: company_name } }
    : user
}

function validateAccount(body, errors) {
  if (!clean(body.firstName)) errors.firstName = 'Required'
  if (!clean(body.lastName)) errors.lastName = 'Required'
  if (!isEmail(clean(body.email))) errors.email = 'Enter a valid email'
  if (typeof body.password !== 'string' || body.password.length < 8)
    errors.password = 'At least 8 characters'
}

const EMAIL_TAKEN = 'An account with this email already exists'
const NAME_TAKEN = 'A company with this name already exists'

// Is the email / company name already used? → { email?, companyName? } messages
async function takenFields(email, companyName) {
  const taken = {}
  if (isEmail(email)) {
    const { rows } = await db.query('SELECT 1 FROM users WHERE email = lower($1)', [email])
    if (rows[0]) taken.email = EMAIL_TAKEN
  }
  if (companyName) {
    const { rows } = await db.query('SELECT 1 FROM companies WHERE lower(trim(name)) = lower($1)', [companyName])
    if (rows[0]) taken.companyName = NAME_TAKEN
  }
  return taken
}

async function createUser(client, body, role) {
  const hash = await bcrypt.hash(body.password, 10)
  const { rows } = await client.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      clean(body.firstName),
      clean(body.lastName),
      clean(body.email).toLowerCase(),
      hash,
      role
    ]
  )
  return rows[0].id
}

async function createSeeker(client, userId, body, phone, skills, cv) {
  await client.query(
    `INSERT INTO seeker_profiles (user_id, phone, major, graduation_status, job_types, work_modes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId,
      phone,
      clean(body.major),
      clean(body.graduationStatus),
      pickList(body.jobTypes, JOB_TYPES),
      pickList(body.workModes, WORK_MODES)
    ]
  )

  // Links the seeker's skills. New skill names are added to the skills list
  const ids = await skillIds(client, skills)
  await client.query(
    `INSERT INTO seeker_skills (seeker_id, skill_id) SELECT $1, unnest($2::int[])`,
    [userId, ids]
  )

  if (cv) {
    const { rows } = await client.query(
      `INSERT INTO resumes (seeker_id, file_name, file_url) VALUES ($1, $2, $3) RETURNING id`,
      [userId, cv.originalname, fileUrl(cv)]
    )
    return rows[0].id
  }
  return null
}

// The company starts on the plan it chose: a paid plan is paid for here, in the same step (simulated card)
async function createCompany(client, userId, phone, body, logo, plan) {
  const { rows } = await client.query(
    `INSERT INTO companies (user_id, name, logo_url, website, phone, industry, location, about)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      userId,
      clean(body.companyName),
      logo ? fileUrl(logo) : null,
      clean(body.website) || null,
      phone,
      clean(body.industry),
      clean(body.location),
      clean(body.about) || null
    ]
  )
  const companyId = rows[0].id
  if (Number(plan.price_bhd_month) > 0) {
    const { payment } = await startSubscription(client, { userId, companyId, plan, method: body.method })
    return payment
  }
  await client.query(`INSERT INTO subscriptions (company_id, plan_id) VALUES ($1, $2)`, [companyId, plan.id])
  return null
}

async function signup(req, res, next) {
  const body = req.body
  const files = Object.values(req.files || {}).flat()
  const role = ROLES[body.role]
  const errors = {}
  let phone = null
  let skills = []
  let plan = null

  if (!role) errors.role = 'Role must be jobseeker or company'
  validateAccount(body, errors)

  const p = toPhone(body.phone)
  if (p.error) errors.phone = p.error
  else phone = p.phone

  if (role === 'seeker') {
    if (!clean(body.major)) errors.major = 'Required'
    if (!clean(body.graduationStatus)) errors.graduationStatus = 'Required'
    skills = [...new Set(toList(body.skills).map(clean).filter(Boolean))]
    if (skills.length === 0) errors.skills = 'Pick at least one skill'
    if (pickList(body.jobTypes, JOB_TYPES).length === 0) errors.jobTypes = 'Pick at least one job type'
    if (pickList(body.workModes, WORK_MODES).length === 0) errors.workModes = 'Pick at least one work mode'
  }

  if (role === 'employer') {
    if (!clean(body.companyName)) errors.companyName = 'Required'
    if (body.website && !/^https?:\/\/\S+\.\S+/.test(clean(body.website)))
      errors.website = 'Start with https://'
    if (!clean(body.industry)) errors.industry = 'Required'
    if (!clean(body.location)) errors.location = 'Required'
    try {
      const { rows } = await db.query(
        `SELECT ${PLAN_COLUMNS} FROM plans p WHERE lower(p.name) = lower($1)`,
        [clean(body.plan) || 'free']
      )
      plan = rows[0]
    } catch (err) {
      removeFiles(files)
      return next(err)
    }
    if (!plan) errors.plan = 'Unknown plan'
    else if (Number(plan.price_bhd_month) > 0 && !PAYMENT_METHODS.includes(body.method))
      errors.method = 'Pay to start a paid plan'
  }

  // same email / company name → shown under that field, together with the other errors
  try {
    const taken = await takenFields(clean(body.email), role === 'employer' ? clean(body.companyName) : '')
    for (const [field, msg] of Object.entries(taken)) errors[field] ??= msg
  } catch (err) {
    removeFiles(files)
    return next(err)
  }

  if (Object.keys(errors).length) {
    removeFiles(files)
    return res
      .status(400)
      .json({ error: 'Please fix the highlighted fields', fields: errors })
  }

  let client
  try {
    client = await db.connect()
  } catch (err) {
    removeFiles(files)
    return next(err)
  }
  try {
    await client.query('BEGIN')
    const userId = await createUser(client, body, role)
    let resumeId = null
    let payment = null
    if (role === 'seeker') {
      resumeId = await createSeeker(
        client,
        userId,
        body,
        phone,
        skills,
        req.files?.cv?.[0]
      )
    } else {
      payment = await createCompany(client, userId, phone, body, req.files?.logo?.[0], plan)
    }
    await client.query('COMMIT')

    const user = await loadUser(userId)
    const result = { token: signToken(user), user }

    if (payment) result.payment = paymentOut(payment)
    res.status(201).json(result)

    // form data sends text, so the unticked box arrives as 'false'
    if (payment && body.emailReceipt !== 'false') emailReceipt(userId, payment)

    // Read the CV and score the seeker after answering, so sign up doesn't wait for it
    if (role === 'seeker') {
      const cvRead = resumeId
        ? saveParsedCv(resumeId, userId, req.files.cv[0].path).catch((err) =>
            console.error('CV parsing after sign up failed:', err.message)
          )
        : Promise.resolve()
      cvRead
        .then(() => rescoreSeeker(userId))
        .catch((err) => console.error('Scoring after sign up failed:', err.message))
    }
  } catch (err) {
    await client.query('ROLLBACK')
    removeFiles(files)
    if (err.code === '23505' && err.constraint === 'users_email_key') {
      return res.status(409).json({
        error: EMAIL_TAKEN,
        fields: { email: EMAIL_TAKEN }
      })
    }
    if (err.code === '23505' && err.constraint === 'companies_name_key') {
      return res.status(409).json({
        error: NAME_TAKEN,
        fields: { companyName: NAME_TAKEN }
      })
    }
    next(err)
  } finally {
    client.release()
  }
}

async function signin(req, res, next) {
  try {
    const email = clean(req.body.email).toLowerCase()
    const password = req.body.password
    if (!isEmail(email) || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Enter your email and password' })
    }

    const { rows } = await db.query(
      'SELECT id, password_hash, role FROM users WHERE email = $1',
      [email]
    )
    const found = rows[0]
    if (!found || !(await bcrypt.compare(password, found.password_hash))) {
      return res.status(401).json({ error: 'Wrong email or password' })
    }

    const wanted = ROLES[req.body.role]
    if (wanted && found.role !== 'admin' && found.role !== wanted) {
      const tab = found.role === 'employer' ? 'Company' : 'Job seeker'
      return res.status(403).json({
        error: `This is a ${tab.toLowerCase()} account. Use the "${tab}" tab.`
      })
    }

    const user = await loadUser(found.id)
    res.json({ token: signToken(user), user })
  } catch (err) {
    next(err)
  }
}

// The logged-in user (frontend calls this on page load)
async function me(req, res, next) {
  try {
    const user = await loadUser(req.user.id)
    if (!user) return res.status(401).json({ error: 'Please sign in' })
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

const RESET_TTL_MINUTES = 60
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex')
const isValidPassword = (v) => typeof v === 'string' && v.length >= 8

async function forgotPassword(req, res, next) {
  try {
    const email = clean(req.body.email).toLowerCase()
    if (!isEmail(email)) {
      return res.status(400).json({
        error: 'Enter a valid email',
        fields: { email: 'Enter a valid email' }
      })
    }

    const { rows } = await db.query(
      'SELECT id, first_name FROM users WHERE email = $1',
      [email]
    )
    const found = rows[0]
    if (found) {
      // Only the newest link works: cancel any older unused ones
      await db.query(
        'UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
        [found.id]
      )

      // The email gets the raw token, the database only keeps its hash
      const token = crypto.randomBytes(32).toString('hex')
      await db.query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at)
         VALUES ($1, $2, now() + make_interval(mins => $3))`,
        [found.id, hashToken(token), RESET_TTL_MINUTES]
      )

      const frontend = (
        process.env.FRONTEND_URL || 'http://localhost:5173'
      ).replace(/\/$/, '')
      const link = `${frontend}/reset-password?token=${token}`
      await sendMail({
        to: email,
        subject: 'Reset your Fursa password',
        text:
          `Hi ${found.first_name},\n\nUse this link to choose a new password:\n${link}\n\n` +
          `The link works once and expires in ${RESET_TTL_MINUTES} minutes. ` +
          `If you didn't ask for this, you can ignore this email.`,
        html:
          `<p>Hi ${found.first_name},</p><p><a href="${link}">Click here to choose a new password</a>.</p>` +
          `<p>The link works once and expires in ${RESET_TTL_MINUTES} minutes. ` +
          `If you didn't ask for this, you can ignore this email.</p>`
      })
    }

    res.json({
      message:
        'If an account exists for this email, we sent a link to reset the password.'
    })
  } catch (err) {
    next(err)
  }
}

// After taking the token from the link in the email
async function resetPassword(req, res, next) {
  const token = clean(req.body.token)
  const password = req.body.password
  if (!token)
    return res
      .status(400)
      .json({ error: 'This reset link is invalid or has expired' })
  if (!isValidPassword(password)) {
    return res.status(400).json({
      error: 'Please fix the highlighted fields',
      fields: { password: 'At least 8 characters' }
    })
  }

  let client
  try {
    client = await db.connect()
  } catch (err) {
    return next(err)
  }
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `UPDATE password_resets SET used_at = now()
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING user_id`,
      [hashToken(token)]
    )
    if (!rows[0]) {
      await client.query('ROLLBACK')
      return res
        .status(400)
        .json({ error: 'This reset link is invalid or has expired' })
    }

    const hash = await bcrypt.hash(password, 10)
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      hash,
      rows[0].user_id
    ])
    await client.query('COMMIT')

    res.json({ message: 'Your password was reset. You can sign in now.' })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body
    const errors = {}
    if (typeof currentPassword !== 'string' || !currentPassword)
      errors.currentPassword = 'Required'
    if (!isValidPassword(newPassword))
      errors.newPassword = 'At least 8 characters'
    else if (newPassword === currentPassword)
      errors.newPassword = 'Must be different from the current password'
    if (Object.keys(errors).length) {
      return res
        .status(400)
        .json({ error: 'Please fix the highlighted fields', fields: errors })
    }

    const { rows } = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    )
    if (!rows[0]) return res.status(401).json({ error: 'Please sign in' })
    if (!(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
      return res.status(400).json({
        error: 'Current password is wrong',
        fields: { currentPassword: 'Wrong password' }
      })
    }

    const hash = await bcrypt.hash(newPassword, 10)
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      hash,
      req.user.id
    ])
    res.json({ message: 'Password changed' })
  } catch (err) {
    next(err)
  }
}

async function deleteAccount(req, res, next) {
  let client
  try {
    client = await db.connect()
  } catch (err) {
    return next(err)
  }
  try {
    const { rows } = await client.query(
      'SELECT password_hash, email, first_name FROM users WHERE id = $1',
      [req.user.id]
    )
    if (!rows[0]) return res.status(401).json({ error: 'Please sign in' })
    const password = req.body.password
    if (
      typeof password !== 'string' ||
      !(await bcrypt.compare(password, rows[0].password_hash))
    ) {
      return res.status(400).json({
        error: 'Wrong password',
        fields: { password: 'Wrong password' }
      })
    }

    await client.query('BEGIN')
    await client.query('DELETE FROM payments WHERE user_id = $1', [req.user.id])
    await client.query('DELETE FROM users WHERE id = $1', [req.user.id])
    await client.query('COMMIT')

    res.json({ message: 'Your account has been deleted' })
    // Confirmation email, sent after answering: a failed email never undoes the delete
    sendMail({
      to: rows[0].email,
      subject: 'Your Fursa account has been deleted',
      text:
        `Hi ${rows[0].first_name},\n\nYour Fursa account and everything in it have been deleted, as you asked.\n` +
        'If this wasn\'t you, please contact us.\n\nThe Fursa team'
    }).catch((err) => console.error('Delete confirmation email failed:', err.message))
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

function logout(req, res) {
  res.json({ message: 'You are logged out' })
}

// POST /api/auth/signup/check { email, companyName? } → { fields } (empty = both free)
// Lets company sign up warn on step 1, before choosing a plan and paying.
async function checkSignup(req, res, next) {
  try {
    const fields = await takenFields(clean(req.body?.email), clean(req.body?.companyName))
    res.json({ fields })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  signup,
  checkSignup,
  signin,
  me,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteAccount
}
