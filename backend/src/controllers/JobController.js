const db = require('../config/db')

// GET /api/jobs → view all jobs (jobseeker)
const list = async (req, res, next) => {
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
const mine = async (req, res, next) =>{
  try {
    const { rows } = await db.query(
      `SELECT j.*
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
const oneJob= async(req, res, next) => {
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
const companyOneJob = async(req, res, next) =>{
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

const createJob = async (req, res, next)=>{
  const body = req.body || null
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
  else if (deadline.slice(0, 10) < today) errors.deadline = 'Deadline must be today or later'

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

if (Object.keys(errors).length) {
  return res.status(400).json({ error: 'Please fix the highlighted fields', fields: errors })
}

let client 
try{
  client = await db.connect()
} catch(err){
  return next(err)
}

try{
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

  if (status === 'open') {
    const { rows: planRows } = await client.query(
    `SELECT p.max_active_jobs,
            (SELECT COUNT(*)::int FROM jobs
              WHERE company_id = $1 AND status = 'open' AND deadline >= CURRENT_DATE) AS active_jobs
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
      WHERE s.company_id = $1 AND s.status = 'active'`,
    [companyId]
  )
    const plan = planRows[0]
    if (plan && plan.max_active_jobs !== null && plan.active_jobs >= plan.max_active_jobs) {
      await client.query('ROLLBACK')
      return res.status(403).json({
      error: `Your plan allows ${plan.max_active_jobs} active job(s). Upgrade your plan or save it as a draft.`
    })
  }
}

  const { rows } = await client.query(
  `INSERT INTO jobs (company_id, job_type, work_mode, title, description, responsibilities,
                     location, salary, deadline, field, major_must_have, min_years, max_years,
                     language, status)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
   RETURNING id`,
  [companyId, job_type, work_mode, title, description, responsibilities,
   location, salary, deadline, field, major_must_have, min_years, max_years,
   language, status]
)
  const jobId = rows[0].id

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

  await client.query('COMMIT')

  const { rows: created } = await db.query(`${ONE_JOB_SELECT} WHERE j.id = $1`, [jobId])
  const job = created[0]
  delete job.jd_embedding
  res.status(201).json({ job })

} catch(err){
  await client.query('ROLLBACK')
  next(err)
} finally {
  client.release()
}
}

module.exports = { list, mine, oneJob, companyOneJob, createJob }
