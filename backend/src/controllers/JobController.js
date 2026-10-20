const db = require('../config/db')

// GET /api/jobs → open jobs whose deadline hasn't passed
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

// GET /api/jobs/mine → this company's jobs (any status)
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

module.exports = { list, mine }

