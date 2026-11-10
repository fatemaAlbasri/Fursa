const db = require('../config/db')
const { inTransaction } = require('../config/transaction')

const STATUSES = ['applied', 'shortlisted', 'interview', 'accepted', 'rejected']

const parseId = (req) => {
  const id = Number(req.params.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

// GET /api/applications → My applications page (seeker)
const getMyApplications = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT a.id, a.status, a.applied_at,
              j.id AS job_id, j.title, j.job_type, j.work_mode, j.location,
              c.name AS company_name, c.logo_url,
              -- latest time they were shortlisted (an Undo can shortlist again)
              (SELECT MAX(changed_at) FROM application_history h
                WHERE h.application_id = a.id AND h.to_status = 'shortlisted') AS shortlisted_at,
              -- the interview time itself (not when it was booked)
              (SELECT scheduled_at FROM interviews i
                WHERE i.application_id = a.id ORDER BY i.id DESC LIMIT 1) AS interview_at,
              -- accepted / rejected date (only used when the status is one of them)
              (SELECT MAX(changed_at) FROM application_history h
                WHERE h.application_id = a.id AND h.to_status IN ('accepted', 'rejected')) AS decided_at
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         JOIN companies c ON c.id = j.company_id
        WHERE a.seeker_id = $1
        ORDER BY a.applied_at DESC`,
      [req.user.id]
    )

    const counts = { all: rows.length }
    for (const s of STATUSES) counts[s] = rows.filter((r) => r.status === s).length

    res.json({ applications: rows, counts })
  } catch (err) {
    next(err)
  }
}

// GET /api/applications/:id → one application (seeker)
const getMyApplication = async (req, res, next) => {
  try {
    const appId = parseId(req)
    if (!appId) return res.status(400).json({ error: 'Invalid application id' })

    const { rows } = await db.query(
      `SELECT a.id, a.status, a.applied_at, a.rejection_reason,
              j.id AS job_id, j.title, j.job_type, j.work_mode, j.location, j.deadline,
              (j.status = 'open' AND j.deadline >= CURRENT_DATE) AS job_is_open,
              c.id AS company_id, c.name AS company_name, c.logo_url,
              c.phone AS company_phone, hr.email AS company_email,
              r.file_name AS cv_file_name, r.file_url AS cv_url,
              m.score,
              -- for "Why you were not selected": must-have skills they don't have, then the others
              COALESCE((SELECT json_agg(s.name ORDER BY s.name)
                          FROM job_skills js
                          JOIN skills s ON s.id = js.skill_id
                          LEFT JOIN seeker_skills ss ON ss.skill_id = js.skill_id AND ss.seeker_id = a.seeker_id
                         WHERE js.job_id = a.job_id AND js.is_required AND ss.skill_id IS NULL), '[]') AS missing_required,
              COALESCE((SELECT json_agg(s.name ORDER BY s.name)
                          FROM job_skills js
                          JOIN skills s ON s.id = js.skill_id
                          LEFT JOIN seeker_skills ss ON ss.skill_id = js.skill_id AND ss.seeker_id = a.seeker_id
                         WHERE js.job_id = a.job_id AND NOT js.is_required AND ss.skill_id IS NULL), '[]') AS missing_other
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         JOIN companies c ON c.id = j.company_id
         JOIN users hr ON hr.id = c.user_id
         JOIN resumes r ON r.id = a.resume_id
         LEFT JOIN match_scores m ON m.job_id = a.job_id AND m.seeker_id = a.seeker_id
        WHERE a.id = $1 AND a.seeker_id = $2`,
      [appId, req.user.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Application not found' })

    const { rejection_reason, missing_required, missing_other, company_phone, company_email, ...application } = rows[0]

    // Latest interview. employer_notes are private
    const { rows: interviews } = await db.query(
      `SELECT scheduled_at, type, location_or_link, note_to_applicant, status
         FROM interviews WHERE application_id = $1 ORDER BY id DESC LIMIT 1`,
      [appId]
    )

    // Timeline 
    const { rows: history } = await db.query(
      `SELECT from_status, to_status, changed_at
         FROM application_history WHERE application_id = $1 ORDER BY changed_at, id`,
      [appId]
    )

    res.json({
      application,
      history,
      interview: application.status === 'interview' ? interviews[0] || null : null,
      contact: application.status === 'accepted' ? { email: company_email, phone: company_phone } : null,
      feedback:
        application.status === 'rejected'
          ? { reason: rejection_reason, missingRequired: missing_required, missingOther: missing_other }
          : null
    })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/applications/:id/interview { action: 'confirm' | 'reschedule', message? } (seeker)
const INTERVIEW_MOVES = {
  confirm: { from: ['invited'], to: 'confirmed' },
  reschedule: { from: ['invited', 'confirmed'], to: 'reschedule_requested' }
}

const replyToInterview = async (req, res, next) => {
  try {
    const appId = parseId(req)
    if (!appId) return res.status(400).json({ error: 'Invalid application id' })

    const move = INTERVIEW_MOVES[req.body?.action]
    if (!move) return res.status(400).json({ error: 'Invalid action' })
    const message = String(req.body?.message || '').trim()
    if (message.length > 300) return res.status(400).json({ error: 'Message is too long' })

    const result = await inTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT a.id, a.job_id, a.status, j.title, c.user_id AS company_user_id,
                u.first_name, u.last_name,
                i.id AS interview_id, i.status AS interview_status, i.scheduled_at
           FROM applications a
           JOIN jobs j ON j.id = a.job_id
           JOIN companies c ON c.id = j.company_id
           JOIN users u ON u.id = a.seeker_id
           JOIN LATERAL (SELECT id, status, scheduled_at FROM interviews
                          WHERE application_id = a.id ORDER BY id DESC LIMIT 1) i ON true
          WHERE a.id = $1 AND a.seeker_id = $2
          FOR UPDATE OF a`,
        [appId, req.user.id]
      )
      const app = rows[0]
      if (!app || app.status !== 'interview') return { code: 404, error: 'Interview not found' }
      if (new Date(app.scheduled_at) <= new Date()) return { code: 409, error: 'This interview has already passed' }
      if (!move.from.includes(app.interview_status)) {
        return {
          code: 409,
          error: app.interview_status === 'confirmed'
            ? 'You already confirmed this interview'
            : 'You already asked to reschedule. Wait for the new time.'
        }
      }

      await client.query('UPDATE interviews SET status = $2 WHERE id = $1', [app.interview_id, move.to])

      // tell the company
      const name = `${app.first_name} ${app.last_name}`
      const text = move.to === 'confirmed'
        ? `${name} confirmed the interview for ${app.title}.`
        : `${name} asked to reschedule the interview for ${app.title}.${message ? ` Message: ${message}` : ''}`
      await client.query(
        `INSERT INTO notifications (user_id, application_id, job_id, type, title, message)
         VALUES ($1, $2, $3, 'interview_reply', $4, $5)`,
        [app.company_user_id, app.id, app.job_id,
          move.to === 'confirmed' ? 'Interview confirmed' : 'Reschedule requested', text]
      )
      return { interview_status: move.to }
    })

    if (result.error) return res.status(result.code).json({ error: result.error })
    res.json({ id: appId, interview_status: result.interview_status })
  } catch (err) {
    next(err)
  }
}

module.exports = { getMyApplications, getMyApplication, replyToInterview }
