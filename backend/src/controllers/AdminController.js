const db = require('../config/db')

// pg returns COUNT/SUM as strings
const num = (v) => Number(v) || 0

// Start date for each period filter (whitelist, so it is safe inside SQL)
const PERIOD_START = {
  month:     "date_trunc('month', now())",
  '3months': "date_trunc('month', now()) - INTERVAL '2 months'",
  year:      "date_trunc('year', now())"
}

// GET /api/admin/overview → top cards + charts
const getOverview = async (req, res, next) => {
  try {
    const period = PERIOD_START[req.query.period] ? req.query.period : 'month'
    const since = PERIOD_START[period]
    const [cards, signups, appStatus, jobTypes, industries, revenue] = await Promise.all([
      // 1) Top cards
      db.query(`
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
      `),

      // 2) New sign-ups per month, last 6 months (empty months show 0)
      db.query(`
        SELECT to_char(m.month, 'Mon') AS month,
               COUNT(u.id) FILTER (WHERE u.role = 'seeker')   AS seekers,
               COUNT(u.id) FILTER (WHERE u.role = 'employer') AS companies
          FROM generate_series(
                 date_trunc('month', now()) - INTERVAL '5 months',
                 date_trunc('month', now()),
                 INTERVAL '1 month'
               ) AS m(month)
          LEFT JOIN users u ON date_trunc('month', u.created_at) = m.month
         GROUP BY m.month
         ORDER BY m.month
      `),

      // 3) Applications by status (fixed order, 0 if none)
      db.query(`
        SELECT s.status, COUNT(a.id) AS count
          FROM unnest(ARRAY['applied','shortlisted','interview','accepted','rejected'])
               WITH ORDINALITY AS s(status, ord)
          LEFT JOIN applications a ON a.status = s.status
         GROUP BY s.status, s.ord
         ORDER BY s.ord
      `),

      // 4) Active jobs by type
      db.query(`
        SELECT t.type, COUNT(j.id) AS count
          FROM unnest(ARRAY['full_time','internship','part_time'])
               WITH ORDINALITY AS t(type, ord)
          LEFT JOIN jobs j ON j.job_type = t.type
                          AND j.status = 'open' AND j.deadline >= CURRENT_DATE
         GROUP BY t.type, t.ord
         ORDER BY t.ord
      `),

      // 5) Top industries by number of posted jobs
      db.query(`
        SELECT c.industry,
               COUNT(DISTINCT c.id) AS companies,
               COUNT(j.id)          AS jobs
          FROM companies c
          LEFT JOIN jobs j ON j.company_id = c.id AND j.status <> 'draft'
         GROUP BY c.industry
         ORDER BY jobs DESC, companies DESC, c.industry
         LIMIT 4
      `),

      // 6) Revenue split for the chosen period
      db.query(`
        SELECT
          COUNT(DISTINCT user_id) FILTER (WHERE item = 'plan')                  AS plan_companies,
          COALESCE(SUM(subtotal_bhd) FILTER (WHERE item = 'plan'), 0)             AS plan_bhd,
          COUNT(*) FILTER (WHERE item = 'advanced_cv_report')                    AS reports,
          COALESCE(SUM(subtotal_bhd) FILTER (WHERE item = 'advanced_cv_report'), 0) AS reports_bhd
          FROM payments
         WHERE status = 'paid' AND paid_at >= ${since}
      `)
    ])

    const r = cards.rows[0]
    const thisMonth = num(r.revenue_month)
    const lastMonth = num(r.revenue_last_month)
    const changePct = lastMonth > 0
      ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
      : null

    const applications = appStatus.rows.map((s) => ({ status: s.status, count: num(s.count) }))
    const jobs = jobTypes.rows.map((t) => ({ type: t.type, count: num(t.count) }))

    const rev = revenue.rows[0]

    res.json({
      seekers:     { total: num(r.seekers),     this_week: num(r.seekers_week) },
      companies:   { total: num(r.companies),   this_week: num(r.companies_week) },
      active_jobs: { total: num(r.active_jobs), this_week: num(r.active_jobs_week) },
      revenue:     { this_month: thisMonth, change_pct: changePct },

      signups: signups.rows.map((m) => ({
        month: m.month,
        seekers: num(m.seekers),
        companies: num(m.companies)
      })),
      applications_by_status: {
        total: applications.reduce((sum, s) => sum + s.count, 0),
        items: applications
      },
      jobs_by_type: {
        total: jobs.reduce((sum, t) => sum + t.count, 0),
        items: jobs
      },
      top_industries: industries.rows.map((i) => ({
        industry: i.industry,
        companies: num(i.companies),
        jobs: num(i.jobs)
      })),

      revenue_breakdown: {
        period,
        plans:      { companies: num(rev.plan_companies), bhd: num(rev.plan_bhd) },
        cv_reports: { count: num(rev.reports),            bhd: num(rev.reports_bhd) },
        total_bhd:  num(rev.plan_bhd) + num(rev.reports_bhd)
      }
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { getOverview }