const db = require('../config/db')
const { saveJobEmbedding, rescoreJob } = require('../services/matching')
const { cleanCvText } = require('../services/cvOptimizer')
const { inTransaction } = require('../config/transaction')

// Runs in the background: the job is still scored without the CV component if embedding fails
const scoreOpenJob = (jobId) =>
  saveJobEmbedding(jobId)
    .catch((err) => console.error('Job embedding failed:', err.message))
    .then(() => rescoreJob(jobId))
    .catch((err) => console.error('Scoring failed:', err.message))

// GET /api/jobs → view all jobs (jobseeker)
const getJobs = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT j.*, c.name AS company_name, c.logo_url AS company_logo,
              ms.score AS match_score
         FROM jobs j
         JOIN companies c ON c.id = j.company_id
         LEFT JOIN match_scores ms ON ms.job_id = j.id AND ms.seeker_id = $1
        WHERE j.status = 'open' AND j.deadline >= CURRENT_DATE
        ORDER BY ms.score DESC NULLS LAST, j.created_at DESC`,
      [req.user.id]
    )
    rows.forEach((job) => delete job.jd_embedding)
    res.json({ jobs: rows })
  } catch (err) {
    next(err)
  }
}

// GET /api/jobs/mine → view only their jobs (company)
const getCompanyJobs = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT j.*, (SELECT COUNT(*)::int FROM applications a WHERE a.job_id = j.id) AS applicants
         FROM jobs j
         JOIN companies c ON c.id = j.company_id
        WHERE c.user_id = $1
        ORDER BY j.created_at DESC`,
      [req.user.id]
    )
    rows.forEach((job) => delete job.jd_embedding)
    res.json({ jobs: rows })
  } catch (err) {
    next(err)
  }
}

const ONE_JOB_SELECT = `
  SELECT j.*, c.name AS company_name, c.logo_url AS company_logo,
         c.industry AS company_industry, c.location AS company_location,
         c.about AS company_about, c.website AS company_website,
         (j.deadline - CURRENT_DATE) AS days_left,
         COALESCE(
           (SELECT json_agg(json_build_object('id', s.id, 'name', s.name, 'is_required', js.is_required))
              FROM job_skills js
              JOIN skills s ON s.id = js.skill_id
             WHERE js.job_id = j.id),
           '[]'
         ) AS skills
    FROM jobs j
    JOIN companies c ON c.id = j.company_id`

const parseJobId = (req) => {
  const jobId = Number(req.params.id)
  if (!Number.isInteger(jobId) || jobId <= 0) {
    return null
  }
  return jobId
}

// GET /api/jobs/:id → view one job (jobseeker)
const getOneJob = async (req, res, next) => {
  try {
    const jobId = parseJobId(req)
    if (!jobId) {
      return res.status(400).json({ error: 'Invalid job id' })
    }

    const { rows } = await db.query(
      `${ONE_JOB_SELECT}
        WHERE j.id = $1 AND j.status = 'open' AND j.deadline >= CURRENT_DATE`,
      [jobId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' })
    }

    const job = rows[0]
    delete job.jd_embedding

    const me = await seekerJobInfo(req.user.id, job.id)
    res.json({ job, me })
  } catch (err) {
    next(err)
  }
}

// GET /api/jobs/mine/:id → view one job (company)
const getCompanyOneJob = async (req, res, next) => {
  try {
    const jobId = parseJobId(req)
    if (!jobId) {
      return res.status(400).json({ error: 'Invalid job id' })
    }

    const { rows } = await db.query(
      `${ONE_JOB_SELECT}
        WHERE j.id = $1 AND c.user_id = $2`,
      [jobId, req.user.id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' })
    }

    const job = rows[0]
    delete job.jd_embedding
    job.stats = await jobStats(jobId)
    res.json({ job })
  } catch (err) {
    next(err)
  }
}

// Numbers for the stat boxes on the company "View job" page
// applicants = everyone who applied, qualified = has every must-have (match_scores.is_qualified),
// newCount = still 'applied' (not reviewed yet)
const jobStats = async (jobId) => {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS applicants,
            COUNT(*) FILTER (WHERE ms.is_qualified)::int AS qualified,
            COUNT(*) FILTER (WHERE a.status = 'applied')::int AS "newCount"
       FROM applications a
       LEFT JOIN match_scores ms ON ms.job_id = a.job_id AND ms.seeker_id = a.seeker_id
      WHERE a.job_id = $1`,
    [jobId]
  )
  return rows[0]
}

const seekerJobInfo = async (seekerId, jobId) => {
  const { rows } = await db.query(
    `SELECT sp.major, sp.years_experience,
            COALESCE((SELECT array_agg(skill_id) FROM seeker_skills WHERE seeker_id = $1), '{}') AS skill_ids,
            (SELECT score FROM match_scores WHERE job_id = $2 AND seeker_id = $1) AS match_score,
            (SELECT file_name FROM resumes WHERE seeker_id = $1 AND is_current) AS cv_file_name,
            (SELECT status FROM applications WHERE job_id = $2 AND seeker_id = $1) AS application_status
       FROM seeker_profiles sp
      WHERE sp.user_id = $1`,
    [seekerId, jobId]
  )
  return rows[0] || null
}

// Checks the "Post a job" body (used by createJob and editJob)
const readJobBody = (body) => {
  const errors = {}

  const title = (body.title || '').trim()
  const description = (body.description || '').trim()
  const location = (body.location || '').trim()
  const responsibilities = (body.responsibilities || '').trim() || null
  const field = (body.field || '').trim() || null
  const language = (body.language || '').trim() || null
  const { job_type, work_mode, deadline } = body
  const major_must_have = body.major_must_have === true
  const salary =
    body.salary == null || body.salary === '' ? null : Number(body.salary)
  const min_years =
    body.min_years == null || body.min_years === '' ? 0 : Number(body.min_years)
  const max_years =
    body.max_years == null || body.max_years === ''
      ? null
      : Number(body.max_years)
  const status = body.status === 'draft' ? 'draft' : 'open'
  const isDraft = status === 'draft'

  // errors
  if (!title) errors.title = 'Title is required'
  else if (title.length > 150) errors.title = 'Title is too long'
  if (!isDraft) {
    if (!description) errors.description = 'Description is required'
    if (!location) errors.location = 'Location is required'
  }

  if (
    (!isDraft || job_type) &&
    !['internship', 'full_time', 'part_time'].includes(job_type)
  )
    errors.job_type = 'Pick a job type'
  if (
    (!isDraft || work_mode) &&
    !['onsite', 'remote', 'hybrid'].includes(work_mode)
  )
    errors.work_mode = 'Pick a work mode'

  const today = new Date().toISOString().slice(0, 10)
  if (!deadline) {
    if (!isDraft) errors.deadline = 'Deadline is required'
  } else if (isNaN(new Date(deadline)))
    errors.deadline = 'Deadline is not a valid date'
  else if (String(deadline).slice(0, 10) < today)
    errors.deadline = 'Deadline must be today or later'

  if (salary !== null && (isNaN(salary) || salary < 0))
    errors.salary = 'Salary must be 0 or more'
  if (!Number.isInteger(min_years) || min_years < 0)
    errors.min_years = 'Must be 0 or more'
  if (
    max_years !== null &&
    (!Number.isInteger(max_years) || max_years < min_years)
  ) {
    errors.max_years = 'Must be at least the minimum years'
  }

  const skills = []
  const seen = new Set()
  for (const skill of Array.isArray(body.skills) ? body.skills : []) {
    const name = (skill?.name || '').trim()
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    skills.push({ name, is_required: skill.is_required === true })
  }
  if (!isDraft && skills.length === 0) errors.skills = 'Add at least one skill'

  const job = {
    title,
    description: description || null,
    location: location || null,
    responsibilities,
    field,
    language,
    job_type: job_type || null,
    work_mode: work_mode || null,
    deadline: deadline || null,
    major_must_have,
    salary,
    min_years,
    max_years,
    status
  }
  return { job, skills, errors }
}

// Returns the plan's max_active_jobs if the company already reached it, otherwise null
const planLimitReached = async (client, companyId) => {
  const { rows } = await client.query(
    `SELECT p.max_active_jobs,
            (SELECT COUNT(*)::int FROM jobs
              WHERE company_id = $1 AND status = 'open' AND deadline >= CURRENT_DATE) AS active_jobs
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
      WHERE s.company_id = $1 AND s.status = 'active'`,
    [companyId]
  )
  const plan = rows[0]
  if (
    plan &&
    plan.max_active_jobs !== null &&
    plan.active_jobs >= plan.max_active_jobs
  ) {
    return plan.max_active_jobs
  }
  return null
}

const planLimitError = (max) => ({
  error: `Your plan allows ${max} active job(s). Upgrade your plan or save it as a draft.`
})

// The company's plan features (has_bulk_actions, has_ai_ranking...)
const loadPlanFeatures = async (companyUserId) => {
  const { rows } = await db.query(
    `SELECT p.has_ai_ranking, p.has_match_reasons, p.has_bulk_actions, p.has_hiring_summary
       FROM companies c
       JOIN subscriptions s ON s.company_id = c.id AND s.status = 'active'
       JOIN plans p ON p.id = s.plan_id
      WHERE c.user_id = $1`,
    [companyUserId]
  )
  return rows[0] || {}
}

// Adds any skill that isn't in the skills table yet, then links all of them to the job
const saveJobSkills = async (client, jobId, skills) => {
  const names = skills.map((s) => s.name)
  const required = skills.filter((s) => s.is_required).map((s) => s.name)

  await client.query(
    `INSERT INTO skills (name) SELECT unnest($1::text[]) ON CONFLICT (name) DO NOTHING`,
    [names]
  )
  await client.query(
    `INSERT INTO job_skills (job_id, skill_id, is_required)
     SELECT $1, id, name = ANY($3::text[]) FROM skills WHERE name = ANY($2::text[])`,
    [jobId, names, required]
  )
}

const loadJob = async (jobId) => {
  const { rows } = await db.query(`${ONE_JOB_SELECT} WHERE j.id = $1`, [jobId])
  const job = rows[0]
  delete job.jd_embedding
  return job
}

// POST /api/jobs/ → add job (company)
const createJob = async (req, res, next) => {
  const { job, skills, errors } = readJobBody(req.body || {})
  if (Object.keys(errors).length) {
    return res
      .status(400)
      .json({ error: 'Please fix the highlighted fields', fields: errors })
  }

  let client
  try {
    client = await db.connect()
  } catch (err) {
    return next(err)
  }

  try {
    await client.query('BEGIN')
    const { rows: companyRows } = await client.query(
      `SELECT id FROM companies WHERE user_id = $1`,
      [req.user.id]
    )
    if (companyRows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Company not found' })
    }
    const companyId = companyRows[0].id

    if (job.status === 'open') {
      const max = await planLimitReached(client, companyId)
      if (max !== null) {
        await client.query('ROLLBACK')
        return res.status(403).json(planLimitError(max))
      }
    }

    const { rows } = await client.query(
      `INSERT INTO jobs (company_id, job_type, work_mode, title, description, responsibilities,
                         location, salary, deadline, field, major_must_have, min_years, max_years,
                         language, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`,
      [
        companyId,
        job.job_type,
        job.work_mode,
        job.title,
        job.description,
        job.responsibilities,
        job.location,
        job.salary,
        job.deadline,
        job.field,
        job.major_must_have,
        job.min_years,
        job.max_years,
        job.language,
        job.status
      ]
    )
    const jobId = rows[0].id

    await saveJobSkills(client, jobId, skills)

    await client.query('COMMIT')

    if (job.status === 'open') scoreOpenJob(jobId)

    res.status(201).json({ job: await loadJob(jobId) })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

// PUT /api/jobs/mine/:id → edit job (company)
const editJob = async (req, res, next) => {
  const jobId = parseJobId(req)
  if (!jobId) {
    return res.status(400).json({ error: 'Invalid job id' })
  }

  const { job, skills, errors } = readJobBody(req.body || {})
  if (Object.keys(errors).length) {
    return res
      .status(400)
      .json({ error: 'Please fix the highlighted fields', fields: errors })
  }

  let client
  try {
    client = await db.connect()
  } catch (err) {
    return next(err)
  }

  try {
    await client.query('BEGIN')

    const { rows: found } = await client.query(
      `SELECT j.id, j.status, j.company_id
         FROM jobs j
         JOIN companies c ON c.id = j.company_id
        WHERE j.id = $1 AND c.user_id = $2
        FOR UPDATE OF j`,
      [jobId, req.user.id]
    )
    if (found.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Job not found' })
    }
    const oldJob = found[0]

    if (job.status === 'open' && oldJob.status !== 'open') {
      const max = await planLimitReached(client, oldJob.company_id)
      if (max !== null) {
        await client.query('ROLLBACK')
        return res.status(403).json(planLimitError(max))
      }
    }

    await client.query(
      `UPDATE jobs
          SET job_type = $2, work_mode = $3, title = $4, description = $5, responsibilities = $6,
              location = $7, salary = $8, deadline = $9, field = $10, major_must_have = $11,
              min_years = $12, max_years = $13, language = $14, status = $15
        WHERE id = $1`,
      [
        jobId,
        job.job_type,
        job.work_mode,
        job.title,
        job.description,
        job.responsibilities,
        job.location,
        job.salary,
        job.deadline,
        job.field,
        job.major_must_have,
        job.min_years,
        job.max_years,
        job.language,
        job.status
      ]
    )

    await client.query(`DELETE FROM job_skills WHERE job_id = $1`, [jobId])
    await saveJobSkills(client, jobId, skills)

    await client.query(`DELETE FROM match_scores WHERE job_id = $1`, [jobId])

    await client.query('COMMIT')

    if (job.status === 'open') scoreOpenJob(jobId)

    const updated = await loadJob(jobId)
    updated.stats = await jobStats(jobId)
    res.json({ job: updated })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

// PATCH /api/jobs/mine/:id/close → close job (company)
const closeJob = async (req, res, next) => {
  try {
    const jobId = parseJobId(req)
    if (!jobId) {
      return res.status(400).json({ error: 'Invalid job id' })
    }

    const { rows } = await db.query(
      `SELECT j.id, j.status
         FROM jobs j
         JOIN companies c ON c.id = j.company_id
        WHERE j.id = $1 AND c.user_id = $2`,
      [jobId, req.user.id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' })
    }
    if (rows[0].status === 'draft') {
      return res
        .status(409)
        .json({ error: 'A draft cannot be closed. Delete it instead.' })
    }
    if (rows[0].status === 'closed') {
      return res.status(409).json({ error: 'This job is already closed.' })
    }

    // Close it + tell the company (same notification as autoCloseJobs, so the bell and page show it)
    await db.query(
      `WITH closed AS (
         UPDATE jobs SET status = 'closed' WHERE id = $1
         RETURNING id, title
       )
       INSERT INTO notifications (user_id, job_id, type, title, message)
       SELECT $2, closed.id, 'job_closed',
              LEFT('Job closed: ' || closed.title, 150),
              (SELECT COUNT(*) FROM applications a
                WHERE a.job_id = closed.id AND a.status IN ('applied', 'shortlisted', 'interview'))
                || ' applicants are waiting for a decision.'
         FROM closed`,
      [jobId, req.user.id]
    )

    const updated = await loadJob(jobId)
    updated.stats = await jobStats(jobId)
    res.json({ job: updated })
  } catch (err) {
    next(err)
  }
}

// Applicant status (company)
const NEXT_STATUS = {
  applied: ['shortlisted', 'rejected'],
  shortlisted: ['interview', 'rejected'],
  interview: ['accepted', 'rejected'],
  rejected: ['shortlisted'],
  accepted: []
}

// The notification the seeker gets for each new status
const STATUS_NOTICE = {
  shortlisted: (a) => [
    'shortlisted',
    'You are shortlisted',
    `${a.company_name} shortlisted you for ${a.title}.`
  ],
  interview: (a) => [
    'interview',
    'Interview invitation',
    `${a.company_name} invited you to an interview for ${a.title}.`
  ],
  accepted: (a) => [
    'accepted',
    'You got the job!',
    `${a.company_name} accepted you for ${a.title}.`
  ],
   rejected: (a, reason) => [
    'rejected',
    'Application not successful',
    `${a.company_name} did not move forward with your application for ${a.title}.${reason ? ` Reason: ${reason}` : ''}`
  ]

}

const parseAppId = (req) => {
  const appId = Number(req.params.appId)
  return Number.isInteger(appId) && appId > 0 ? appId : null
}

const loadOwnApplication = async (client, jobId, appId, companyUserId) => {
  const { rows } = await client.query(
    `SELECT a.id, a.job_id, a.seeker_id, a.status, j.title, c.name AS company_name
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN companies c ON c.id = j.company_id
      WHERE a.id = $1 AND a.job_id = $2 AND c.user_id = $3
      FOR UPDATE OF a`,
    [appId, jobId, companyUserId]
  )
  return rows[0] || null
}

const notifySeeker = async (client, app, [type, title, message]) => {
  await client.query(
    `INSERT INTO notifications (user_id, application_id, job_id, type, title, message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [app.seeker_id, app.id, app.job_id, type, title, message]
  )
}

const moveApplication = async (
  client,
  app,
  to,
  changedBy,
  { reason = null, notify = true } = {}
) => {
  if (!NEXT_STATUS[app.status].includes(to)) {
    const err = new Error(`Can't move an applicant from ${app.status} to ${to}`)
    err.status = 409
    throw err
  }
  // the reason is kept only while rejected (Undo clears it)
  await client.query(
    'UPDATE applications SET status = $2, rejection_reason = $3 WHERE id = $1',
    [app.id, to, to === 'rejected' ? reason : null]
  )
  // rejected after an interview → the interview is over
  if (to === 'rejected' && app.status === 'interview') {
    await client.query(
      `UPDATE interviews SET status = 'done'
        WHERE id = (SELECT id FROM interviews WHERE application_id = $1 ORDER BY id DESC LIMIT 1)`,
      [app.id]
    )
  }

  await client.query(
    `INSERT INTO application_history (application_id, changed_by, from_status, to_status)
     VALUES ($1, $2, $3, $4)`,
    [app.id, changedBy, app.status, to]
  )
  if (notify) await notifySeeker(client, app, STATUS_NOTICE[to](app, reason))
}

const readReason = (body) => {
  const reason = String(body?.reason || '').trim()
  if (!reason) return { error: 'Pick a reason' }
  if (reason.length > 300) return { error: 'Reason is too long' }
  return { reason }
}

// GET /api/jobs/mine/:id/applicants/:appId → one applicant's page (company)
const getOneApplicant = async (req, res, next) => {
  try {
    const jobId = parseJobId(req)
    const appId = parseAppId(req)
    if (!jobId || !appId) return res.status(400).json({ error: 'Invalid id' })

    const { rows } = await db.query(
      `SELECT a.id, a.status, a.rejection_reason, a.applied_at,
              u.first_name, u.last_name, u.email, sp.phone,
              sp.major, sp.years_experience,
              r.file_name AS cv_file_name, r.file_url AS cv_url, r.parsed_text AS cv_text,
              j.title AS job_title, j.field, j.major_must_have, j.min_years, j.max_years, j.language,
              m.score, COALESCE(m.is_qualified, true) AS is_qualified,
              -- Rank #: 1 + how many applicants of this job scored higher
              CASE WHEN m.score IS NULL THEN NULL ELSE
                (SELECT COUNT(*) + 1 FROM applications a2
                   JOIN match_scores m2 ON m2.job_id = a2.job_id AND m2.seeker_id = a2.seeker_id
                  WHERE a2.job_id = a.job_id AND m2.score > m.score)::int
              END AS rank,
              (SELECT COUNT(*) FROM applications WHERE job_id = a.job_id)::int AS total_applicants,
              -- "Why this score": every job skill, must-have or not, in the CV or not
              COALESCE((SELECT json_agg(json_build_object(
                          'name', s.name, 'required', js.is_required, 'has', ss.skill_id IS NOT NULL)
                          ORDER BY js.is_required DESC, s.name)
                          FROM job_skills js
                          JOIN skills s ON s.id = js.skill_id
                          LEFT JOIN seeker_skills ss ON ss.skill_id = js.skill_id AND ss.seeker_id = a.seeker_id
                         WHERE js.job_id = a.job_id), '[]') AS skills
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         JOIN companies c ON c.id = j.company_id
         JOIN users u ON u.id = a.seeker_id
         JOIN seeker_profiles sp ON sp.user_id = a.seeker_id
         JOIN resumes r ON r.id = a.resume_id
         LEFT JOIN match_scores m ON m.job_id = a.job_id AND m.seeker_id = a.seeker_id
        WHERE a.id = $1 AND a.job_id = $2 AND c.user_id = $3`,
      [appId, jobId, req.user.id]
    )
    if (rows.length === 0)
      return res.status(404).json({ error: 'Applicant not found' })

    // these don't depend on each other so run them at the same time
    const [{ rows: interviews }, { rows: history }, { rows: nav }] =
      await Promise.all([
        // latest interview, null if there isn't one yet
        db.query(
          `SELECT id, scheduled_at, type, location_or_link, note_to_applicant, employer_notes, status
           FROM interviews WHERE application_id = $1 ORDER BY id DESC LIMIT 1`,
          [appId]
        ),
        db.query(
          `SELECT from_status, to_status, changed_at
           FROM application_history WHERE application_id = $1 ORDER BY changed_at, id`,
          [appId]
        ),
        // previous / next applicant, same order as the applicants list
        db.query(
          `SELECT position, prev_id, next_id FROM (
           SELECT a.id,
                  (ROW_NUMBER() OVER w)::int AS position,
                  LAG(a.id)  OVER w AS prev_id,
                  LEAD(a.id) OVER w AS next_id
             FROM applications a
             LEFT JOIN match_scores m ON m.job_id = a.job_id AND m.seeker_id = a.seeker_id
            WHERE a.job_id = $1
           WINDOW w AS (ORDER BY m.score DESC NULLS LAST, a.applied_at, a.id)
         ) t
         WHERE id = $2`,
          [jobId, appId]
        )
      ])

    // cv text for the highlighted view, null if the file couldn't be read
    const applicant = {
      ...rows[0],
      cv_text: rows[0].cv_text ? cleanCvText(rows[0].cv_text) : null
    }

    res.json({
      applicant,
      interview: interviews[0] || null,
      history,
      nav: nav[0]
    })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/jobs/mine/:id/applicants/:appId  { status, reason? } (company)
// shortlisted (also Undo from rejected)
// rejected (reason required)
// accepted (after interview)
const updateOneApplicant = async (req, res, next) => {
  try {
    const jobId = parseJobId(req)
    const appId = parseAppId(req)
    if (!jobId || !appId) return res.status(400).json({ error: 'Invalid id' })

    const { status } = req.body || {}
    if (!['shortlisted', 'rejected', 'accepted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    let reason = null
    if (status === 'rejected') {
      const r = readReason(req.body)
      if (r.error) return res.status(400).json({ error: r.error })
      reason = r.reason
    }

    const found = await inTransaction(async (client) => {
      const app = await loadOwnApplication(client, jobId, appId, req.user.id)
      if (!app) return false
      await moveApplication(client, app, status, req.user.id, { reason })
      return true
    })
    if (!found) return res.status(404).json({ error: 'Applicant not found' })

    res.json({ id: appId, status, rejection_reason: reason })
  } catch (err) {
    next(err)
  }
}

// Interview time in Bahrain, e.g. "20 Oct, 10:00 AM" (used in the seeker's notification)
// Some Node versions put a narrow no-break space before AM/PM; make it a normal one.
const formatInterviewTime = (when) => {
  const day = when.toLocaleDateString('en-GB', { timeZone: 'Asia/Bahrain', day: 'numeric', month: 'short' })
  const time = when.toLocaleTimeString('en-US', { timeZone: 'Asia/Bahrain', hour: 'numeric', minute: '2-digit' })
  return `${day}, ${time}`.replace(/\s/g, ' ')
}

// POST /api/jobs/mine/:id/applicants/:appId/interview { date, time, type, location, note? } (company)
// shortlisted → schedules it and moves to "interview"
// already "interview" → reschedules it
const scheduleInterview = async (req, res, next) => {
  try {
    const jobId = parseJobId(req)
    const appId = parseAppId(req)
    if (!jobId || !appId) return res.status(400).json({ error: 'Invalid id' })

    const { date, time, type } = req.body || {}
    const location = String(req.body?.location || '').trim()
    const note = String(req.body?.note || '').trim() || null

    const errors = {}
    const scheduledAt = new Date(`${date}T${time}:00+03:00`)
    if (!date || !time || isNaN(scheduledAt))
      errors.date = 'Pick a date and time'
    else if (scheduledAt <= new Date())
      errors.date = 'The interview must be in the future'
    if (!['in_person', 'online'].includes(type))
      errors.type = 'Pick in person or online'
    if (!location)
      errors.location =
        type === 'online' ? 'Add the meeting link' : 'Add the location'
    if (Object.keys(errors).length)
      return res.status(400).json({ error: 'Check the form', errors })

    const result = await inTransaction(async (client) => {
      const app = await loadOwnApplication(client, jobId, appId, req.user.id)
      if (!app) return null

      if (app.status === 'interview') {
        await client.query(
          `UPDATE interviews
              SET scheduled_at = $2, type = $3, location_or_link = $4, note_to_applicant = $5, status = 'invited'
            WHERE id = (SELECT id FROM interviews WHERE application_id = $1 ORDER BY id DESC LIMIT 1)`,
          [app.id, scheduledAt, type, location, note]
        )
        await notifySeeker(client, app, [
          'interview',
          'Interview rescheduled',
          `${app.company_name} moved your interview for ${app.title} to ${formatInterviewTime(scheduledAt)}.`
        ])
        return 'rescheduled'
      }

      // notify: false → the notice below has the interview date, the generic one doesn't
      await moveApplication(client, app, 'interview', req.user.id, { notify: false })
      await notifySeeker(client, app, [
        'interview',
        'Interview scheduled',
        `${app.company_name} invited you to an interview for ${app.title} on ${formatInterviewTime(scheduledAt)}.`
      ])
      await client.query(
        `INSERT INTO interviews (application_id, scheduled_at, type, location_or_link, note_to_applicant)
         VALUES ($1, $2, $3, $4, $5)`,
        [app.id, scheduledAt, type, location, note]
      )
      return 'scheduled'
    })
    if (!result) return res.status(404).json({ error: 'Applicant not found' })

    res
      .status(result === 'scheduled' ? 201 : 200)
      .json({ id: appId, status: 'interview', result })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/jobs/mine/:id/applicants/:appId/interview/notes { notes } (company, never shown to the seeker)
const saveInterviewNotes = async (req, res, next) => {
  try {
    const jobId = parseJobId(req)
    const appId = parseAppId(req)
    if (!jobId || !appId) return res.status(400).json({ error: 'Invalid id' })
    const notes = String(req.body?.notes || '').trim() || null

    const { rowCount } = await db.query(
      `UPDATE interviews i SET employer_notes = $1
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         JOIN companies c ON c.id = j.company_id
        WHERE i.application_id = a.id AND a.id = $2 AND a.job_id = $3 AND c.user_id = $4
          AND i.id = (SELECT id FROM interviews WHERE application_id = $2 ORDER BY id DESC LIMIT 1)`,
      [notes, appId, jobId, req.user.id]
    )
    if (rowCount === 0)
      return res.status(404).json({ error: 'Interview not found' })
    res.json({ notes })
  } catch (err) {
    next(err)
  }
}

// GET /api/jobs/mine/:id/applicants → applicants of one job, best match first (company)
const getApplicants = async (req, res, next) => {
  try {
    const jobId = parseJobId(req)
    if (!jobId) {
      return res.status(400).json({ error: 'Invalid job id' })
    }

    const { rows } = await db.query(
      `SELECT a.id, a.status, a.applied_at, u.first_name, u.last_name,
              m.score, COALESCE(m.is_qualified, true) AS is_qualified,
              COALESCE(m.breakdown->'missing', '[]') AS missing
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         JOIN companies c ON c.id = j.company_id
         JOIN users u ON u.id = a.seeker_id
         LEFT JOIN match_scores m ON m.job_id = a.job_id AND m.seeker_id = a.seeker_id
        WHERE a.job_id = $1 AND c.user_id = $2
        ORDER BY m.score DESC NULLS LAST, a.applied_at, a.id`,
      [jobId, req.user.id]
    )
    res.json({ applicants: rows })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/jobs/mine/:id/applicants { ids, status, reason?, notify? } (company)
// Bulk shortlist / reject. Applicants that can't make that move (e.g. already accepted) are skipped.
const updateApplicants = async (req, res, next) => {
  try {
    const jobId = parseJobId(req)
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map(Number).filter(Number.isInteger)
      : []
    const { status } = req.body || {}
    const notify = req.body?.notify !== false
    if (!jobId || ids.length === 0)
      return res.status(400).json({ error: 'Pick at least one applicant' })
    if (!['shortlisted', 'rejected'].includes(status))
      return res.status(400).json({ error: 'Invalid status' })

    // Free plan has no bulk actions (Plans page)
    const features = await loadPlanFeatures(req.user.id)
    if (!features.has_bulk_actions) {
      return res.status(403).json({
        error: 'Bulk shortlist / reject is on the Starter and Growth plans. Upgrade to use it.'
      })
    }
    let reason = null
    if (status === 'rejected') {
      const r = readReason(req.body)
      if (r.error) return res.status(400).json({ error: r.error })
      reason = r.reason
    }

    const updated = []
    await inTransaction(async (client) => {
      for (const appId of ids) {
        const app = await loadOwnApplication(client, jobId, appId, req.user.id)
        if (!app || !NEXT_STATUS[app.status].includes(status)) continue
        await moveApplication(client, app, status, req.user.id, {
          reason,
          notify
        })
        updated.push(appId)
      }
    })
    res.json({
      updated,
      skipped: ids.filter((id) => !updated.includes(id)),
      status
    })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/jobs/mine/:id → delete job (company)
const deleteJob = async (req, res, next) => {
  try {
    const jobId = parseJobId(req)
    if (!jobId) {
      return res.status(400).json({ error: 'Invalid job id' })
    }

    const { rows } = await db.query(
      `SELECT j.id, (SELECT COUNT(*)::int FROM applications WHERE job_id = j.id) AS applicants
         FROM jobs j
         JOIN companies c ON c.id = j.company_id
        WHERE j.id = $1 AND c.user_id = $2`,
      [jobId, req.user.id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' })
    }

    if (rows[0].applicants > 0) {
      return res.status(409).json({
        error: 'This job has applicants. Close it instead of deleting it.'
      })
    }

    await db.query(`DELETE FROM jobs WHERE id = $1`, [jobId])
    res.json({ message: 'Job deleted successfully' })
  } catch (err) {
    next(err)
  }
}

// POST /api/jobs/:id/apply → apply with the current CV (jobseeker)
const applyToJob = async (req, res, next) => {
  let client
  try {
    const jobId = parseJobId(req)
    if (!jobId) return res.status(400).json({ error: 'Invalid job id' })

    client = await db.connect()
    await client.query('BEGIN')

    const { rows: jobs } = await client.query(
      `SELECT j.id, j.title, c.user_id AS company_user_id
         FROM jobs j JOIN companies c ON c.id = j.company_id
        WHERE j.id = $1 AND j.status = 'open' AND j.deadline >= CURRENT_DATE`,
      [jobId]
    )
    if (jobs.length === 0) {
      await client.query('ROLLBACK')
      return res
        .status(404)
        .json({ error: 'This job is closed or does not exist' })
    }

    const { rows: cv } = await client.query(
      'SELECT id FROM resumes WHERE seeker_id = $1 AND is_current',
      [req.user.id]
    )
    if (cv.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Upload a CV before applying' })
    }

    const { rows: app } = await client.query(
      `INSERT INTO applications (job_id, seeker_id, resume_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (job_id, seeker_id) DO NOTHING
       RETURNING id, status, applied_at`,
      [jobId, req.user.id, cv[0].id]
    )
    if (app.length === 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'You already applied to this job' })
    }

    await client.query(
      `INSERT INTO application_history (application_id, changed_by, from_status, to_status)
       VALUES ($1, $2, NULL, 'applied')`,
      [app[0].id, req.user.id]
    )

    // one unread "new applicants" notice per job: add to it instead of one per person
    const { rows: open } = await client.query(
      `SELECT id, title FROM notifications
        WHERE user_id = $1 AND job_id = $2 AND type = 'new_applicants' AND NOT is_read
        ORDER BY id DESC LIMIT 1`,
      [jobs[0].company_user_id, jobId]
    )
    const count = open.length ? (parseInt(open[0].title, 10) || 1) + 1 : 1
    const title = `${count} new applicant${count > 1 ? 's' : ''}`
    const message = `${title} for ${jobs[0].title}.`

    if (open.length) {
      await client.query(
        'UPDATE notifications SET title = $2, message = $3, created_at = now() WHERE id = $1',
        [open[0].id, title, message]
      )
    } else {
      await client.query(
        `INSERT INTO notifications (user_id, job_id, type, title, message)
         VALUES ($1, $2, 'new_applicants', $3, $4)`,
        [jobs[0].company_user_id, jobId, title, message]
      )
    }

    await client.query('COMMIT')

    res.status(201).json({ application: app[0] })
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {})
    next(err)
  } finally {
    if (client) client.release()
  }
}

module.exports = {
  getJobs,
  getCompanyJobs,
  getOneJob,
  getCompanyOneJob,
  createJob,
  editJob,
  deleteJob,
  closeJob,
  getApplicants,
  updateApplicants,
  applyToJob,
  getOneApplicant,
  updateOneApplicant,
  scheduleInterview,
  saveInterviewNotes
}
