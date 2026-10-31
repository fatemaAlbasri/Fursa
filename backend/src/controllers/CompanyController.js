const db = require('../config/db')

// A job a seeker can apply to (same rule as GET /api/jobs)
const OPEN_JOB = `j.status = 'open' AND j.deadline >= CURRENT_DATE`

// GET /api/companies → all companies + how many open jobs each has (jobseeker)
// Companies with no open jobs are included (open_jobs = 0) for the "All companies" tab.
const getCompanies = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.name, c.logo_url, c.industry, c.location, c.about,
              COUNT(j.id)::int AS open_jobs
         FROM companies c
         LEFT JOIN jobs j ON j.company_id = c.id AND ${OPEN_JOB}
        GROUP BY c.id
        ORDER BY open_jobs DESC, c.name`
    )
    res.json({ companies: rows })
  } catch (err) {
    next(err)
  }
}

const parseCompanyId = (req) => {
  const companyId = Number(req.params.id)
  if (!Number.isInteger(companyId) || companyId <= 0) {
    return null
  }
  return companyId
}

// GET /api/companies/:id → one company's profile, its open jobs and tips (jobseeker)
const getOneCompany = async (req, res, next) => {
  try {
    const companyId = parseCompanyId(req)
    if (!companyId) {
      return res.status(400).json({ error: 'Invalid company id' })
    }

    // The company + when its account was made (companies has no created_at, so use its user's)
    // + job counts. Drafts are never shown to seekers; "closed" also counts open jobs past their deadline.
    const { rows } = await db.query(
      `SELECT c.id, c.name, c.logo_url, c.website, c.industry, c.location, c.about,
              u.created_at AS member_since,
              (SELECT COUNT(*)::int FROM jobs j
                WHERE j.company_id = c.id AND ${OPEN_JOB}) AS open_jobs,
              (SELECT COUNT(*)::int FROM jobs j
                WHERE j.company_id = c.id
                  AND (j.status = 'closed' OR (j.status = 'open' AND j.deadline < CURRENT_DATE))) AS closed_jobs
         FROM companies c
         JOIN users u ON u.id = c.user_id
        WHERE c.id = $1`,
      [companyId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' })
    }
    const company = rows[0]

    // Open jobs, best match for this seeker first (match_score is null when not scored yet → last)
    const { rows: jobs } = await db.query(
      `SELECT j.id, j.title, j.job_type, j.work_mode, j.location, j.deadline,
              ms.score AS match_score
         FROM jobs j
         LEFT JOIN match_scores ms ON ms.job_id = j.id AND ms.seeker_id = $2
        WHERE j.company_id = $1 AND ${OPEN_JOB}
        ORDER BY ms.score DESC NULLS LAST, j.deadline, j.id`,
      [companyId, req.user.id]
    )

    // "How to stand out here": the skills this company asks for most in its posted jobs,
    // and whether the seeker already has each one. Empty list = nothing to show.
    const { rows: standOut } = await db.query(
      `SELECT s.id, s.name, COUNT(*)::int AS jobs_asking,
              EXISTS (SELECT 1 FROM seeker_skills ss
                       WHERE ss.seeker_id = $2 AND ss.skill_id = s.id) AS seeker_has
         FROM jobs j
         JOIN job_skills js ON js.job_id = j.id
         JOIN skills s ON s.id = js.skill_id
        WHERE j.company_id = $1 AND j.status <> 'draft'
        GROUP BY s.id
        ORDER BY jobs_asking DESC, s.name
        LIMIT 3`,
      [companyId, req.user.id]
    )

    res.json({ company, jobs, stand_out: standOut })
  } catch (err) {
    next(err)
  }
}

module.exports = { getCompanies, getOneCompany }
