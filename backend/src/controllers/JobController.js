const db = require('../config/db')

// GET /api/jobs → view all jobs (jobseeker)
const getJobs = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT j.*, c.name AS company_name, c.logo_url AS company_logo
         FROM jobs j
         JOIN companies c ON c.id = j.company_id
        WHERE j.status = 'open' AND j.deadline >= CURRENT_DATE
        ORDER BY j.created_at DESC`
    )
    res.json({ jobs: rows })
  } catch (err) {
    next(err)
  }
}

// GET /api/jobs/mine → view only their jobs (company)
const getCompanyJobs = async (req, res, next) =>{
  try {
    const { rows } = await db.query(
      `SELECT j.*, (SELECT COUNT(*)::int FROM applications a WHERE a.job_id = j.id) AS applicants
         FROM jobs j
         JOIN companies c ON c.id = j.company_id
        WHERE c.user_id = $1
        ORDER BY j.created_at DESC`,
      [req.user.id]
    )
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
const getOneJob= async(req, res, next) => {
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
const getCompanyOneJob = async(req, res, next) =>{
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
    res.json({ job })
  } catch (err) {
    next(err)
  }
}

const seekerJobInfo = async(seekerId, jobId) => {
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
  const salary = body.salary == null || body.salary === '' ? null : Number(body.salary)
  const min_years = body.min_years == null || body.min_years === '' ? 0 : Number(body.min_years)
  const max_years = body.max_years == null || body.max_years === '' ? null : Number(body.max_years)
  const status = body.status === 'draft' ? 'draft' : 'open'

  // errors
  if (!title) errors.title = 'Title is required'
  else if (title.length > 150) errors.title = 'Title is too long'
  if (!description) errors.description = 'Description is required'
  if (!location) errors.location = 'Location is required'

  if (!['internship', 'full_time', 'part_time'].includes(job_type)) errors.job_type = 'Pick a job type'
  if (!['onsite', 'remote', 'hybrid'].includes(work_mode)) errors.work_mode = 'Pick a work mode'

  const today = new Date().toISOString().slice(0, 10)
  if (!deadline || isNaN(new Date(deadline))) errors.deadline = 'Deadline is required'
  else if (String(deadline).slice(0, 10) < today) errors.deadline = 'Deadline must be today or later'

  if (salary !== null && (isNaN(salary) || salary < 0)) errors.salary = 'Salary must be 0 or more'
  if (!Number.isInteger(min_years) || min_years < 0) errors.min_years = 'Must be 0 or more'
  if (max_years !== null && (!Number.isInteger(max_years) || max_years < min_years)) {
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
  if (skills.length === 0) errors.skills = 'Add at least one skill'

  const job = {
    title, description, location, responsibilities, field, language, job_type, work_mode,
    deadline, major_must_have, salary, min_years, max_years, status
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
  if (plan && plan.max_active_jobs !== null && plan.active_jobs >= plan.max_active_jobs) {
    return plan.max_active_jobs
  }
  return null
}

const planLimitError = (max) => ({
  error: `Your plan allows ${max} active job(s). Upgrade your plan or save it as a draft.`
})

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
    return res.status(400).json({ error: 'Please fix the highlighted fields', fields: errors })
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
      [companyId, job.job_type, job.work_mode, job.title, job.description, job.responsibilities,
       job.location, job.salary, job.deadline, job.field, job.major_must_have, job.min_years,
       job.max_years, job.language, job.status]
    )
    const jobId = rows[0].id

    await saveJobSkills(client, jobId, skills)

    await client.query('COMMIT')

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
    return res.status(400).json({ error: 'Please fix the highlighted fields', fields: errors })
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
      [jobId, job.job_type, job.work_mode, job.title, job.description, job.responsibilities,
       job.location, job.salary, job.deadline, job.field, job.major_must_have,
       job.min_years, job.max_years, job.language, job.status]
    )

    await client.query(`DELETE FROM job_skills WHERE job_id = $1`, [jobId])
    await saveJobSkills(client, jobId, skills)

    await client.query(`DELETE FROM match_scores WHERE job_id = $1`, [jobId])

    await client.query('COMMIT')

    res.json({ job: await loadJob(jobId) })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
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
        ORDER BY m.score DESC NULLS LAST, a.applied_at`,
      [jobId, req.user.id]
    )
    res.json({ applicants: rows })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/jobs/mine/:id/applicants → shortlist the ticked applicants (company)
// body: { ids: [1, 2], status: 'shortlisted' }
const updateApplicants = async (req, res, next) => {
  try {
    const jobId = parseJobId(req)
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : []
    const { status } = req.body || {}
    if (!jobId || ids.length === 0) {
      return res.status(400).json({ error: 'Pick at least one applicant' })
    }
    if (status !== 'shortlisted') {
      return res.status(400).json({ error: 'Invalid status' })
    }

    // Change the status and keep a history row for each changed application
    const { rows } = await db.query(
      `WITH old AS (
         SELECT a.id, a.status
           FROM applications a
           JOIN jobs j ON j.id = a.job_id
           JOIN companies c ON c.id = j.company_id
          WHERE a.id = ANY($1::int[]) AND a.job_id = $2 AND c.user_id = $3 AND a.status <> $4
       ),
       changed AS (
         UPDATE applications SET status = $4 WHERE id IN (SELECT id FROM old) RETURNING id
       )
       INSERT INTO application_history (application_id, changed_by, from_status, to_status)
       SELECT id, $3, status, $4 FROM old
       RETURNING application_id AS id`,
      [ids, jobId, req.user.id, status]
    )
    res.json({ updated: rows.map((r) => r.id), status })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/jobs/mine/:id → delete job (company) -not in frontend-
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
      return res.status(409).json({ error: 'This job has applicants. Close it instead of deleting it.' })
    }

    await db.query(`DELETE FROM jobs WHERE id = $1`, [jobId])
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

module.exports = { getJobs, getCompanyJobs, getOneJob, getCompanyOneJob, createJob, editJob, deleteJob, getApplicants, updateApplicants }
