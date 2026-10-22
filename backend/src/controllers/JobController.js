const db = require('../config/db')

// GET /api/jobs → view all jobs (jobseeker)
async function list(req, res, next) {
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
async function mine(req, res, next) {
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


function parseJobId(req) {
  const jobId = Number(req.params.id)
  if (!Number.isInteger(jobId) || jobId <= 0){
      return null
  }
  return jobId
}

// GET /api/jobs/:id → view one job (jobseeker)
async function oneJob(req, res, next) {
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
async function companyOneJob(req, res, next) {
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

async function seekerJobInfo(seekerId, jobId) {
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



module.exports = { list, mine, oneJob, companyOneJob }

