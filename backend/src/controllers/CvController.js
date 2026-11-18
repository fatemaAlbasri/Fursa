const path = require('path')
const db = require('../config/db')
const { fileUrl, removeFiles, UPLOADS_DIR } = require('../middleware/upload')
const { parseCv, saveParsedCv, saveCvEmbedding } = require('../services/cvParser')
const { rescoreSeeker } = require('../services/matching')

async function parse(req, res, next) {
  const file = req.file
  if (!file) return res.status(400).json({ error: 'Please upload your CV', fields: { cv: 'Required' } })
  try {
    const { info, source } = await parseCv(file.path)
    res.json({ cv: info, source })
  } catch (err) {
    next(err)
  } finally {
    removeFiles([file])
  }
}

// Logged-in seeker uploads a new CV: it becomes the current one and is parsed
async function upload(req, res, next) {
  const file = req.file
  if (!file) return res.status(400).json({ error: 'Please upload your CV', fields: { cv: 'Required' } })

  let resumeId
  let client
  try {
    client = await db.connect()
  } catch (err) {
    removeFiles([file])
    return next(err)
  }
  try {
    await client.query('BEGIN')
    // Old CVs stay (past applications point to them) but are no longer current
    await client.query('UPDATE resumes SET is_current = false WHERE seeker_id = $1 AND is_current', [req.user.id])
    const { rows } = await client.query(
      `INSERT INTO resumes (seeker_id, file_name, file_url) VALUES ($1, $2, $3) RETURNING id`,
      [req.user.id, file.originalname, fileUrl(file)]
    )
    resumeId = rows[0].id
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    removeFiles([file])
    // 23503 = no seeker_profiles row for this user
    if (err.code === '23503') return res.status(403).json({ error: 'Only job seekers can upload a CV' })
    return next(err)
  } finally {
    client.release()
  }

  // The CV is saved even if it can't be read; parsed stays null in that case
  let parsed = null
  let source = null
  let warning
  try {
    const result = await saveParsedCv(resumeId, req.user.id, file.path)
    parsed = result.info
    source = result.source
  } catch (err) {
    if (err.status !== 422) console.error('CV parsing failed:', err)
    warning = err.status === 422 ? err.message : "Your CV was saved, but we couldn't read its details."
    // Don't keep scoring on the old CV
    await saveCvEmbedding(req.user.id, null).catch((err) => console.error('Clearing CV embedding failed:', err.message))
  }
  rescoreSeeker(req.user.id).catch((err) => console.error('Scoring failed:', err.message))
  res.status(201).json({ resume: await loadResume(req.user.id), parsed, source, ...(warning && { warning }) })
}

// The seeker's current CV with what was read from it
async function current(req, res, next) {
  try {
    const resume = await loadResume(req.user.id)
    if (!resume) return res.status(404).json({ error: 'You have not uploaded a CV yet' })
    res.json({ resume })
  } catch (err) {
    next(err)
  }
}

// The seeker's own current CV file, sent with the name it was uploaded with (not the random saved name)
async function download(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT file_name, file_url FROM resumes WHERE seeker_id = $1 AND is_current',
      [req.user.id]
    )
    const resume = rows[0]
    if (!resume) return res.status(404).json({ error: 'You have not uploaded a CV yet' })

    // file_url is "/uploads/cv/<file>": only the base name is used, so the path can't leave the CV folder
    const filePath = path.join(UPLOADS_DIR, 'cv', path.basename(resume.file_url))
    res.download(filePath, resume.file_name, (err) => {
      if (!err) return
      if (res.headersSent) return console.error('CV download failed:', err.message)
      if (err.code === 'ENOENT' || err.status === 404) return res.status(404).json({ error: 'Your CV file could not be found. Please upload it again.' })
      next(err)
    })
  } catch (err) {
    next(err)
  }
}

async function loadResume(seekerId) {
  const { rows } = await db.query(
    `SELECT id, file_name, file_url, parsed_experience, parsed_languages,
            parsed_text IS NOT NULL AS is_parsed, uploaded_at
       FROM resumes WHERE seeker_id = $1 AND is_current`,
    [seekerId]
  )
  return rows[0] || null
}

module.exports = { parse, upload, current, download }
