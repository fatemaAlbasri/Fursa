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
const PAGE_SIZE = 10

// Page number from ?page= (1 if missing or wrong)
const readPage = (req) => Math.max(1, parseInt(req.query.page, 10) || 1)

// "noor" → "%noor%" for ILIKE, or null when there is no search
const readSearch = (req) => {
  const q = (req.query.q || '').trim()
  return q ? `%${q}%` : null
}

// Every seeker with a CV flag and application count, filtered by search ($1)
const SEEKERS_CTE = `
  WITH s AS (
    SELECT u.id, u.first_name, u.last_name, u.email, u.created_at,
           sp.major, sp.graduation_status,
           EXISTS (SELECT 1 FROM resumes r WHERE r.seeker_id = u.id) AS has_cv,
           (SELECT COUNT(*) FROM applications a WHERE a.seeker_id = u.id) AS applications
      FROM users u
      JOIN seeker_profiles sp ON sp.user_id = u.id
     WHERE u.role = 'seeker'
       AND ($1::text IS NULL
            OR (u.first_name || ' ' || u.last_name || ' ' || u.email) ILIKE $1)
  )
`

const SEEKER_TABS = ['all', 'cv', 'nocv']

// GET /api/admin/seekers?tab=all|cv|nocv&q=&page=
const getSeekers = async (req, res, next) => {
  try {
    const tab = SEEKER_TABS.includes(req.query.tab) ? req.query.tab : 'all'
    const search = readSearch(req)
    const page = readPage(req)

    const [cards, tabs, list] = await Promise.all([
      // 1) Top cards (whole platform, not affected by search)
      db.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE role = 'seeker') AS seekers,
          (SELECT COUNT(DISTINCT seeker_id) FROM resumes) AS with_cv,
          (SELECT COUNT(DISTINCT r.seeker_id)
             FROM cv_reviews cr JOIN resumes r ON r.id = cr.resume_id) AS used_optimizer,
          (SELECT COUNT(DISTINCT user_id) FROM payments
             WHERE item = 'advanced_cv_report' AND status = 'paid') AS bought_report
      `),

      // 2) Count per tab (follows the search)
      db.query(`${SEEKERS_CTE}
        SELECT COUNT(*) AS all,
               COUNT(*) FILTER (WHERE has_cv)     AS cv,
               COUNT(*) FILTER (WHERE NOT has_cv) AS nocv
          FROM s
      `, [search]),

      // 3) One page of rows for the chosen tab
      db.query(`${SEEKERS_CTE}
        SELECT * FROM s
         WHERE $2 = 'all'
            OR ($2 = 'cv'   AND has_cv)
            OR ($2 = 'nocv' AND NOT has_cv)
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4
      `, [search, tab, PAGE_SIZE, (page - 1) * PAGE_SIZE])
    ])

    const c = cards.rows[0]
    const t = tabs.rows[0]
    const total = num(t[tab])

    res.json({
      cards: {
        seekers: num(c.seekers),
        with_cv: num(c.with_cv),
        used_optimizer: num(c.used_optimizer),
        bought_report: num(c.bought_report)
      },
      tabs: { all: num(t.all), cv: num(t.cv), nocv: num(t.nocv) },
      seekers: list.rows.map((s) => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        email: s.email,
        major: s.major,
        graduation_status: s.graduation_status,
        has_cv: s.has_cv,
        applications: num(s.applications),
        joined: s.created_at
      })),
      page,
      page_size: PAGE_SIZE,
      total,
      total_pages: Math.max(1, Math.ceil(total / PAGE_SIZE))
    })
  } catch (err) {
    next(err)
  }
}
// Every company with its current plan, jobs and applicants, filtered by search ($1)
const COMPANIES_CTE = `
  WITH c AS (
    SELECT co.id, co.name, co.logo_url, co.industry, co.location,
           u.email, u.created_at,
           COALESCE(p.name, 'Free') AS plan,
           (SELECT COUNT(*) FROM jobs j
             WHERE j.company_id = co.id AND j.status <> 'draft') AS jobs,
           (SELECT COUNT(*) FROM applications a
              JOIN jobs j ON j.id = a.job_id
             WHERE j.company_id = co.id) AS applicants
      FROM companies co
      JOIN users u ON u.id = co.user_id
      LEFT JOIN subscriptions s ON s.company_id = co.id AND s.status = 'active'
      LEFT JOIN plans p ON p.id = s.plan_id
     WHERE ($1::text IS NULL OR (co.name || ' ' || u.email) ILIKE $1)
  )
`

// How many companies are on each plan
const PLAN_COUNTS = `${COMPANIES_CTE}
  SELECT COUNT(*) AS all,
         COUNT(*) FILTER (WHERE plan = 'Free')    AS "Free",
         COUNT(*) FILTER (WHERE plan = 'Starter') AS "Starter",
         COUNT(*) FILTER (WHERE plan = 'Growth')  AS "Growth"
    FROM c
`

const COMPANY_TABS = ['all', 'Free', 'Starter', 'Growth']

const planCountsOut = (r) => ({
  all: num(r.all),
  Free: num(r.Free),
  Starter: num(r.Starter),
  Growth: num(r.Growth)
})

// GET /api/admin/companies?plan=all|Free|Starter|Growth&q=&page=
const getCompanies = async (req, res, next) => {
  try {
    const plan = COMPANY_TABS.includes(req.query.plan) ? req.query.plan : 'all'
    const search = readSearch(req)
    const page = readPage(req)

    const [cards, tabs, list] = await Promise.all([
      // 1) Top cards: whole platform (no search)
      db.query(PLAN_COUNTS, [null]),
      // 2) Count per tab: follows the search
      db.query(PLAN_COUNTS, [search]),
      // 3) One page of rows for the chosen plan
      db.query(`${COMPANIES_CTE}
        SELECT * FROM c
         WHERE $2 = 'all' OR plan = $2
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4
      `, [search, plan, PAGE_SIZE, (page - 1) * PAGE_SIZE])
    ])

    const t = planCountsOut(tabs.rows[0])
    const total = t[plan]

    res.json({
      cards: planCountsOut(cards.rows[0]),
      tabs: t,
      companies: list.rows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        logo_url: c.logo_url,
        industry: c.industry,
        location: c.location,
        plan: c.plan,
        jobs: num(c.jobs),
        applicants: num(c.applicants),
        joined: c.created_at
      })),
      page,
      page_size: PAGE_SIZE,
      total,
      total_pages: Math.max(1, Math.ceil(total / PAGE_SIZE))
    })
  } catch (err) {
    next(err)
  }
}

// Every posted job (drafts hidden), filtered by search ($1)
// active = open and deadline not passed, closed = closed by hand or expired
const JOBS_CTE = `
  WITH jb AS (
    SELECT j.id, j.title, j.job_type, j.created_at, j.deadline,
           co.id AS company_id, co.name AS company_name, co.logo_url AS company_logo,
           CASE WHEN j.status = 'open' AND j.deadline >= CURRENT_DATE
                THEN 'active' ELSE 'closed' END AS status,
           (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicants
      FROM jobs j
      JOIN companies co ON co.id = j.company_id
     WHERE j.status <> 'draft'
       AND ($1::text IS NULL OR (j.title || ' ' || co.name) ILIKE $1)
  )
`

const JOB_TABS = ['all', 'active', 'closed']

// GET /api/admin/jobs?status=all|active|closed&q=&page=
const getJobs = async (req, res, next) => {
  try {
    const status = JOB_TABS.includes(req.query.status) ? req.query.status : 'all'
    const search = readSearch(req)
    const page = readPage(req)

    const [tabs, list] = await Promise.all([
      // 1) Count per tab (follows the search)
      db.query(`${JOBS_CTE}
        SELECT COUNT(*) AS all,
               COUNT(*) FILTER (WHERE status = 'active') AS active,
               COUNT(*) FILTER (WHERE status = 'closed') AS closed
          FROM jb
      `, [search]),

      // 2) One page of rows for the chosen tab
      db.query(`${JOBS_CTE}
        SELECT * FROM jb
         WHERE $2 = 'all' OR status = $2
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4
      `, [search, status, PAGE_SIZE, (page - 1) * PAGE_SIZE])
    ])

    const t = tabs.rows[0]
    const counts = { all: num(t.all), active: num(t.active), closed: num(t.closed) }
    const total = counts[status]

    res.json({
      tabs: counts,
      jobs: list.rows.map((j) => ({
        id: j.id,
        title: j.title,
        company: { id: j.company_id, name: j.company_name, logo_url: j.company_logo },
        job_type: j.job_type,
        applicants: num(j.applicants),
        posted: j.created_at,
        deadline: j.deadline,
        status: j.status
      })),
      page,
      page_size: PAGE_SIZE,
      total,
      total_pages: Math.max(1, Math.ceil(total / PAGE_SIZE))
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { getOverview, getSeekers, getCompanies, getJobs }