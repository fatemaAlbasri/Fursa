import { useEffect, useState } from 'react'
import Notice from '../../shared/components/Notice.jsx'
import { api } from '../../shared/api.js'
import { formatJobType } from '../../shared/utils/jobFormat.js'
import { DownloadIcon } from '../../shared/components/icons.jsx'
import { downloadPdf } from '../../jobseeker/utils/cvOptimizerApi.js'
import { formatBhd, formatCount } from '../utils/format.js'
import { SkLine, StatsLoading } from '../components/AdminSkeleton.jsx'
import '../styles/Admin.css'
import '../styles/AdminOverview.css'

const PERIODS = [
  { key: 'month', label: 'This month' },
  { key: '3months', label: 'Last 3 months' },
  { key: 'year', label: 'This year' }
]

// Same colours as the status pills on the company pages
const STATUSES = {
  applied: { label: 'Applied', color: 'var(--teal)' },
  shortlisted: { label: 'Shortlisted', color: '#075985' },
  interview: { label: 'Interview', color: '#5235d6' },
  accepted: { label: 'Accepted', color: '#067647' },
  rejected: { label: 'Rejected', color: '#b42318' }
}

// Horizontal bars: [{ label, count, color }]
function BarList({ items }) {
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <ul className="ov-bars">
      {items.map((i) => (
        <li key={i.label} className="ov-bars__row">
          <span className="ov-bars__label">{i.label}</span>
          <span className="ov-bars__track">
            <span
              className="ov-bars__fill"
              style={{ width: `${(i.count / max) * 100}%`, background: i.color }}
            />
          </span>
          <span className="ov-bars__num">{formatCount(i.count)}</span>
        </li>
      ))}
    </ul>
  )
}

// One bar in the sign-ups chart, with its number on top
function Bar({ value, max, kind }) {
  return (
    <span className="ov-bar-wrap">
      <span className="ov-bar__num">{value}</span>
      <span className={`ov-bar ov-bar--${kind}`} style={{ '--h': value / max }} />
    </span>
  )
}

// Grey shapes in the same layout as the overview, while it loads
function OverviewLoading() {
  const panelTitle = (
    <div className="admin-sk-lines ov-sk-title">
      <SkLine width="40%" />
      <SkLine width="25%" thin />
    </div>
  )
  return (
    <div role="status" aria-label="Loading overview">
      <StatsLoading />
      <div className="ov-row ov-row--two" aria-hidden="true">
        <section className="admin-panel">
          {panelTitle}
          <div className="ov-chart ov-chart--loading">
            {[45, 60, 40, 70, 50, 85].map((h, i) => (
              <span key={i} className="sk ov-sk-bar" style={{ height: `${h}%` }} />
            ))}
          </div>
        </section>
        <section className="admin-panel">
          {panelTitle}
          <div className="admin-sk-lines">
            {[90, 70, 55, 40, 65].map((w, i) => (
              <SkLine key={i} width={`${w}%`} />
            ))}
          </div>
        </section>
      </div>
      <div className="ov-row ov-row--three" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <section key={i} className="admin-panel">
            {panelTitle}
            <div className="admin-sk-lines">
              {[80, 65, 75].map((w, n) => (
                <SkLine key={n} width={`${w}%`} thin />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export default function AdminOverview() {
  const [period, setPeriod] = useState('month')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false // a slower old request must not overwrite a newer one
    api(`/admin/overview?period=${period}`)
      .then((d) => {
        if (ignore) return
        setData(d)
        setError('')
      })
      .catch((err) => !ignore && setError(err.error || 'Could not load the overview.'))
    return () => {
      ignore = true
    }
  }, [period])

  // GET /api/admin/report: the same numbers as this page as a PDF (revenue for the chosen period)
  const [downloading, setDownloading] = useState(false)
  const downloadReport = async () => {
    setDownloading(true)
    setError('')
    try {
      const date = new Date().toISOString().slice(0, 10)
      await downloadPdf(`/admin/report?period=${period}`, `fursa-admin-report-${date}.pdf`)
    } catch (err) {
      setError(err.error || 'Could not download the report.')
    } finally {
      setDownloading(false)
    }
  }

  const head = (
    <div className="admin-head">
      <div>
        <h1>Overview</h1>
        <p>How Fursa is doing</p>
      </div>
      {data && (
        <button
          type="button"
          className="btn btn--primary ov-download"
          onClick={downloadReport}
          disabled={downloading}
          aria-busy={downloading}
        >
          <DownloadIcon />
          {downloading ? 'Preparing…' : 'Download report'}
        </button>
      )}
    </div>
  )

  // First load: title + grey shapes of the page (or the error)
  if (!data) {
    return (
      <>
        {head}
        {error ? <Notice notice={{ type: 'error', text: error }} /> : <OverviewLoading />}
      </>
    )
  }

  const { revenue, revenue_breakdown: rev } = data
  const change = revenue.change_pct
  const cards = [
    {
      label: 'Job seekers',
      value: formatCount(data.seekers.total),
      hint: `+${data.seekers.this_week} this week`,
      down: false,
      flat: data.seekers.this_week === 0
    },
    {
      label: 'Companies',
      value: formatCount(data.companies.total),
      hint: `+${data.companies.this_week} this week`,
      down: false,
      flat: data.companies.this_week === 0
    },
    {
      label: 'Active jobs',
      value: formatCount(data.active_jobs.total),
      hint: `+${data.active_jobs.this_week} this week`,
      down: false,
      flat: data.active_jobs.this_week === 0
    },
    {
      label: 'Revenue this month',
      value: formatBhd(revenue.this_month),
      hint:
        change === null
          ? 'No sales last month'
          : `${change >= 0 ? '+' : ''}${change}% vs last month`,
      down: change !== null && change < 0
    }
  ]

  const maxSignup = Math.max(1, ...data.signups.flatMap((m) => [m.seekers, m.companies]))
  const periodLabel = PERIODS.find((p) => p.key === period).label

  return (
    <>
      {head}

      <Notice notice={error && { type: 'error', text: error }} />

      {/* 4 number cards */}
      <div className="admin-stats">
        {cards.map((c) => (
          <div key={c.label} className="admin-stat">
            <div className="admin-stat__value">{c.value}</div>
            <div className="admin-stat__label">{c.label}</div>
            <div className={'admin-stat__hint' + (c.down ? ' admin-stat__hint--down' : '') + (c.flat ? ' admin-stat__hint--flat' : '')}>
              {c.hint}
            </div>
          </div>
        ))}
      </div>

      <div className="ov-row ov-row--two">
        {/* Sign-ups chart */}
        <section className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <h2 className="admin-panel__title">New sign-ups</h2>
              <p className="admin-panel__sub">Last 6 months</p>
            </div>
            <div className="ov-legend">
              <span><i className="ov-dot ov-bar--seekers" />Job seekers</span>
              <span><i className="ov-dot ov-bar--companies" />Companies</span>
            </div>
          </div>
          <div className="ov-chart">
            {data.signups.map((m) => (
              <div
                key={m.month}
                className="ov-chart__col"
                aria-label={`${m.month}: ${m.seekers} job seekers, ${m.companies} companies`}
              >
                <div className="ov-chart__bars" aria-hidden="true">
                  <Bar value={m.seekers} max={maxSignup} kind="seekers" />
                  <Bar value={m.companies} max={maxSignup} kind="companies" />
                </div>
                <span className="ov-chart__label">{m.month}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Applications by status */}
        <section className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <h2 className="admin-panel__title">Applications by status</h2>
              <p className="admin-panel__sub">
                {formatCount(data.applications_by_status.total)} applications in total
              </p>
            </div>
          </div>
          <BarList
            items={data.applications_by_status.items.map((s) => ({
              label: STATUSES[s.status].label,
              count: s.count,
              color: STATUSES[s.status].color
            }))}
          />
        </section>
      </div>

      <div className="ov-row ov-row--three">
        {/* Jobs by type */}
        <section className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <h2 className="admin-panel__title">Jobs by type</h2>
              <p className="admin-panel__sub">{data.jobs_by_type.total} active jobs</p>
            </div>
          </div>
          <BarList
            items={data.jobs_by_type.items.map((t) => ({
              label: formatJobType(t.type),
              count: t.count,
              color: 'var(--teal)'
            }))}
          />
        </section>

        {/* Top industries */}
        <section className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <h2 className="admin-panel__title">Top industries</h2>
              <p className="admin-panel__sub">By number of jobs</p>
            </div>
          </div>
          <ul className="ov-list">
            {data.top_industries.map((i) => (
              <li key={i.industry} className="ov-list__row">
                <div>
                  <div className="ov-list__name">{i.industry}</div>
                  <div className="ov-list__meta">
                    {i.companies} {i.companies === 1 ? 'company' : 'companies'}
                  </div>
                </div>
                <span className="ov-list__value">
                  {i.jobs} {i.jobs === 1 ? 'job' : 'jobs'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Revenue (the only part the period changes) */}
        <section className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <h2 className="admin-panel__title">Revenue</h2>
              <p className="admin-panel__sub">{periodLabel} · simulated payments</p>
            </div>
          </div>
          <div className="admin-tabs ov-periods">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={period === p.key}
                className={'admin-tab' + (period === p.key ? ' admin-tab--active' : '')}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <ul className="ov-list">
            <li className="ov-list__row">
              <div>
                <div className="ov-list__name">Company plans</div>
                <div className="ov-list__meta">
                  {rev.plans.companies} {rev.plans.companies === 1 ? 'company' : 'companies'}
                </div>
              </div>
              <span className="ov-list__value">{formatBhd(rev.plans.bhd)}</span>
            </li>
            <li className="ov-list__row">
              <div>
                <div className="ov-list__name">Advanced CV reports</div>
                <div className="ov-list__meta">
                  {rev.cv_reports.count} {rev.cv_reports.count === 1 ? 'report' : 'reports'}
                </div>
              </div>
              <span className="ov-list__value">{formatBhd(rev.cv_reports.bhd)}</span>
            </li>
          </ul>
          <div className="ov-total">
            <span>Total</span>
            <span>{formatBhd(rev.total_bhd)}</span>
          </div>
        </section>
      </div>
    </>
  )
}