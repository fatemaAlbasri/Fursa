const db = require('../config/db')

// A job a seeker can apply to (same rule as GET /api/jobs)
const OPEN_JOB = `j.status = 'open' AND j.deadline >= CURRENT_DATE`

// GET /api/companies → all companies + how many open jobs each has (jobseeker)
// Companies with no open jobs are included (open_jobs = 0) for the "All companies" tab.
// Only companies the admin approved are shown (new ones wait in 'pending').
const getCompanies = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.name, c.logo_url, c.industry, c.location, c.about,
              COUNT(j.id)::int AS open_jobs
         FROM companies c
         LEFT JOIN jobs j ON j.company_id = c.id AND ${OPEN_JOB}
        WHERE c.status = 'approved'
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
              -- for the admin's review only (removed below for seekers)
              c.status, c.cr_number, c.rejection_reason, c.reviewed_at, c.phone, c.review_note, c.resubmitted_at,
              u.first_name AS hr_first_name, u.last_name AS hr_last_name, u.email AS hr_email,
              (SELECT COUNT(*)::int FROM jobs j
                WHERE j.company_id = c.id AND ${OPEN_JOB}) AS open_jobs,
              (SELECT COUNT(*)::int FROM jobs j
                WHERE j.company_id = c.id
                  AND (j.status = 'closed' OR (j.status = 'open' AND j.deadline < CURRENT_DATE))) AS closed_jobs
         FROM companies c
         JOIN users u ON u.id = c.user_id
        WHERE c.id = $1 AND (c.status = 'approved' OR $2)`,
      [companyId, req.user.role === 'admin']
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' })
    }
    const {
      status, cr_number, rejection_reason, reviewed_at, phone, review_note, resubmitted_at,
      hr_first_name, hr_last_name, hr_email, ...company
    } = rows[0]
    // The admin also gets what it needs to approve / reject the company
    if (req.user.role === 'admin') {
      company.review = {
        status,
        cr_number,
        rejection_reason,
        reviewed_at,
        phone,
        // sent again after a rejection: when, and what the company wrote
        resubmitted_at: status === 'pending' ? resubmitted_at : null,
        review_note: status === 'pending' ? review_note : null,
        hr: { name: `${hr_first_name} ${hr_last_name}`, email: hr_email }
      }
    }

    // Open jobs, best match for this seeker first (match_score is null when not scored yet → last)
    const { rows: jobs } = await db.query(
      `SELECT j.id, j.title, j.job_type, j.work_mode, j.location, j.deadline,
              ms.score AS match_score, ms.is_qualified
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
