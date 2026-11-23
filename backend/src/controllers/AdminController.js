const db = require('../config/db')

// pg returns COUNT/SUM as strings
const num = (v) => Number(v) || 0

// GET /api/admin/overview → the 4 top cards
const getOverview = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'seeker') AS seekers,
        (SELECT COUNT(*) FROM users WHERE role = 'seeker'
           AND created_at >= now() - INTERVAL '7 days') AS seekers_week,

        (SELECT COUNT(*) FROM users WHERE role = 'employer') AS companies,
        (SELECT COUNT(*) FROM users WHERE role = 'employer'
           AND created_at >= now() - INTERVAL '7 days') AS companies_week,

        (SELECT COUNT(*) FROM jobs
           WHERE status = 'open' AND deadline >= CURRENT_DATE) AS active_jobs,
        (SELECT COUNT(*) FROM jobs
           WHERE status = 'open' AND deadline >= CURRENT_DATE
           AND created_at >= now() - INTERVAL '7 days') AS active_jobs_week,

        (SELECT COALESCE(SUM(subtotal_bhd), 0) FROM payments
           WHERE status = 'paid'
           AND paid_at >= date_trunc('month', now())) AS revenue_month,
        (SELECT COALESCE(SUM(subtotal_bhd), 0) FROM payments
           WHERE status = 'paid'
           AND paid_at >= date_trunc('month', now()) - INTERVAL '1 month'
           AND paid_at <  date_trunc('month', now())) AS revenue_last_month
    `)
    const r = rows[0]

    const thisMonth = num(r.revenue_month)
    const lastMonth = num(r.revenue_last_month)
    // No sales last month → no % to compare with
    const changePct = lastMonth > 0
      ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
      : null

    res.json({
      seekers:     { total: num(r.seekers),     this_week: num(r.seekers_week) },
      companies:   { total: num(r.companies),   this_week: num(r.companies_week) },
      active_jobs: { total: num(r.active_jobs), this_week: num(r.active_jobs_week) },
      revenue:     { this_month: thisMonth, change_pct: changePct }
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { getOverview }