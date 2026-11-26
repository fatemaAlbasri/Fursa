import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Notice from '../../shared/components/Notice.jsx'
import CompanyLogo from '../../jobseeker/components/CompanyLogo.jsx'
import { api } from '../../shared/api.js'
import {
  formatDeadline,
  formatExperience,
  formatJobType,
  formatSalary,
  formatWorkMode,
  splitLines
} from '../../shared/utils/jobFormat.js'
import { formatCount } from '../utils/format.js'
import { SkLine, StatsLoading } from '../components/AdminSkeleton.jsx'
import '../styles/Admin.css'
import '../styles/AdminJobView.css'

// Grey shapes in the same layout as the job page, while it loads
function JobLoading() {
  return (
    <div role="status" aria-label="Loading job">
      <section className="admin-panel aj-head" aria-hidden="true">
        <span className="sk aj-head__logo" />
        <div className="aj-head__text admin-sk-lines">
          <SkLine width="45%" />
          <SkLine width="30%" thin />
        </div>
        <span className="sk sk--pill" />
      </section>
      <StatsLoading count={3} className="aj-stats" />
      <div className="aj-layout" aria-hidden="true">
        <div className="aj-main">
          {[0, 1].map((i) => (
            <section key={i} className="admin-panel admin-sk-lines">
              <SkLine width="30%" />
              <SkLine width="95%" thin />
              <SkLine width="85%" thin />
              <SkLine width="60%" thin />
            </section>
          ))}
        </div>
        <aside className="admin-panel aj-side admin-sk-lines">
          <SkLine width="45%" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkLine key={i} width="100%" thin />
          ))}
        </aside>
      </div>
    </div>
  )
}

// One job, open or closed, as the admin sees it (no apply button, no match score)
export default function AdminJobView() {
  const { id } = useParams()
  const [job, setJob] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false // a late answer must not update the page after leaving it
    setJob(null)
    setError('')
    api(`/admin/jobs/${id}`)
      .then((data) => !ignore && setJob(data.job))
      .catch((err) => !ignore && setError(err.error || 'Could not load this job.'))
    return () => {
      ignore = true
    }
  }, [id])

  const backLink = (
    <Link to="/admin/jobs" className="admin-back">
      ← All jobs
    </Link>
  )

  if (error) {
    return (
      <>
        {backLink}
        <Notice notice={{ type: 'error', text: error }} />
      </>
    )
  }
  if (!job) {
    return (
      <>
        {backLink}
        <JobLoading />
      </>
    )
  }

  // Same rule as the backend: open and the deadline has not passed
  const active = job.status === 'open' && job.days_left >= 0
  const required = job.skills.filter((s) => s.is_required)
  const niceToHave = job.skills.filter((s) => !s.is_required)
  const responsibilities = splitLines(job.responsibilities)

  const details = [
    ['Type', formatJobType(job.job_type)],
    ['Work mode', formatWorkMode(job.work_mode)],
    ['Location', job.location],
    ['Salary', formatSalary(job.salary) || 'Not shown'],
    ['Experience', formatExperience(job.min_years, job.max_years)],
    ['Major', job.field ? `${job.field}${job.major_must_have ? ' (must have)' : ''}` : 'Any'],
    ['Language', job.language || 'Not set'],
    ['Posted', formatDeadline(job.created_at)],
    ['Deadline', formatDeadline(job.deadline)]
  ]

  const stats = [
    ['Applicants', job.stats.applicants],
    ['Have every must-have skill', job.stats.qualified],
    ['Not reviewed yet', job.stats.newCount]
  ]

  return (
    <>
      {backLink}

      {/* Title, company, status */}
      <section className="admin-panel aj-head">
        <CompanyLogo
          job={{ company_id: job.company_id, company_name: job.company_name, company_logo: job.company_logo }}
          className="admin-logo aj-head__logo"
        />
        <div className="aj-head__text">
          <h1>{job.title}</h1>
          <p>
            <Link to={`/admin/companies/${job.company_id}`}>{job.company_name}</Link>
            {' · '}
            {job.company_industry}
          </p>
        </div>
        <span className={`admin-pill admin-pill--${active ? 'active' : 'closed'}`}>
          {active ? 'Active' : 'Closed'}
        </span>
      </section>

      <div className="admin-stats aj-stats">
        {stats.map(([label, value]) => (
          <div key={label} className="admin-stat">
            <div className="admin-stat__value">{formatCount(value)}</div>
            <div className="admin-stat__label">{label}</div>
          </div>
        ))}
      </div>

      <div className="aj-layout">
        <div className="aj-main">
          <section className="admin-panel">
            <h2 className="admin-panel__title">About the role</h2>
            <p className="aj-text">{job.description}</p>
          </section>

          {responsibilities.length > 0 && (
            <section className="admin-panel">
              <h2 className="admin-panel__title">Responsibilities</h2>
              <ul className="aj-list">
                {responsibilities.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="admin-panel">
            <h2 className="admin-panel__title">Skills</h2>
            {job.skills.length === 0 && <p className="aj-text">No skills added.</p>}
            {required.length > 0 && (
              <>
                <h3 className="aj-sub">Must have</h3>
                <div className="aj-chips">
                  {required.map((s) => (
                    <span key={s.id} className="aj-chip aj-chip--must">
                      {s.name}
                    </span>
                  ))}
                </div>
              </>
            )}
            {niceToHave.length > 0 && (
              <>
                <h3 className="aj-sub">Nice to have</h3>
                <div className="aj-chips">
                  {niceToHave.map((s) => (
                    <span key={s.id} className="aj-chip">
                      {s.name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        <aside className="admin-panel aj-side">
          <h2 className="admin-panel__title">Job details</h2>
          <dl className="aj-info">
            {details.map(([label, value]) => (
              <div key={label} className="aj-info__item">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </>
  )
}
