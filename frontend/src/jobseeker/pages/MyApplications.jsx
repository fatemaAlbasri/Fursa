import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api.js'
import StatusPill from '../../shared/components/StatusPill.jsx'
import {
  SendIcon,
  StarIcon,
  CalendarIcon,
  FlagIcon,
  CheckIcon,
  XIcon,
  ChevronRightIcon
} from '../../shared/components/icons.jsx'
import { formatJobType, formatWorkMode } from '../../shared/utils/jobFormat.js'
import CompanyLogo from '../components/CompanyLogo.jsx'
import {
  STATUS_LABELS,
  APPLICATION_TABS,
  formatStatus,
  formatShortDate,
  progressSteps
} from '../utils/applicationFormat.js'
import '../styles/MyApplications.css'

// =====================================================================
// My applications (/jobseeker/applications).
// Every job the seeker applied to, with a count per status, status tabs and each one's progress.
// Data: GET /api/applications → { applications, counts }. A card opens the application's details.
// =====================================================================

// Icon in each progress box. The decision box changes once the company decides.
const STEP_ICONS = {
  applied: <SendIcon />,
  shortlisted: <StarIcon />,
  interview: <CalendarIcon />,
  decision: <FlagIcon />
}
const stepIcon = (step) =>
  step.state === 'accepted' ? <CheckIcon /> : step.state === 'rejected' ? <XIcon /> : STEP_ICONS[step.key]

// CompanyLogo reads the same names a job has (company_id, company_name, company_logo)
const logoInfo = (application) => ({
  company_id: application.company_id,
  company_name: application.company_name,
  company_logo: application.logo_url
})

// Applied → Shortlisted → Interview → Decision
function Progress({ application }) {
  return (
    <ol className="ma-progress" aria-label="Progress">
      {progressSteps(application).map((step) => (
        <li
          key={step.key}
          className={`ma-step ma-step--${step.key} ma-step--${step.state}`}
          aria-current={step.state === 'current' ? 'step' : undefined}
        >
          <span className="ma-step__icon" aria-hidden="true">
            {stepIcon(step)}
          </span>
          <span className="ma-step__label">{step.label}</span>
          <span className="ma-step__date">{step.date}</span>
        </li>
      ))}
    </ol>
  )
}

// One application; the whole card opens its details
function ApplicationCard({ application }) {
  const meta = [
    application.company_name,
    formatJobType(application.job_type),
    formatWorkMode(application.work_mode),
    `Applied ${formatShortDate(application.applied_at)}`
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link to={`/jobseeker/applications/${application.id}`} className="ma-card">
      <CompanyLogo job={logoInfo(application)} className="ma-logo" />
      <div className="ma-card__info">
        <h3 className="ma-card__title">{application.title}</h3>
        <p className="ma-card__meta">{meta}</p>
      </div>
      <Progress application={application} />
      <span className="ma-card__status">
        <StatusPill status={formatStatus(application.status)} />
      </span>
      <span className="ma-card__chevron" aria-hidden="true">
        <ChevronRightIcon />
      </span>
    </Link>
  )
}

// Grey shapes in the same layout as the page while it loads 
// the count boxes, the tabs and three application cards
function ApplicationsLoading() {
  const line = (width, thin) => <span className={thin ? 'sk sk--line sk--thin' : 'sk sk--line'} style={{ width }} />
  return (
    <div className="ma-loading" role="status" aria-label="Loading your applications">
      <div className="ma-summary" aria-hidden="true">
        {Object.keys(STATUS_LABELS).map((status) => (
          <div key={status} className="ma-stat">
            {line(28)}
            {line('70%', true)}
          </div>
        ))}
      </div>
      <div className="ma-tabs" aria-hidden="true">
        {APPLICATION_TABS.map(({ id }) => (
          <span key={id} className="sk ma-sk-tab" />
        ))}
      </div>
      <ul className="ma-list" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <div className="ma-card ma-card--loading">
              <span className="sk ma-logo" />
              <div className="ma-card__info ma-loading__text">
                {line('70%')}
                {line('90%', true)}
              </div>
              <div className="ma-sk-steps">
                {[0, 1, 2, 3].map((step) => (
                  <span key={step} className="ma-sk-step">
                    <span className="sk ma-sk-step__icon" />
                    {line(48, true)}
                  </span>
                ))}
              </div>
              <span className="ma-card__status">
                <span className="sk sk--pill" />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function MyApplications() {
  const navigate = useNavigate()

  const [applications, setApplications] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0) // "Try again" bumps this to load again
  const [tab, setTab] = useState('all')

  // Load the signed-in user, then their applications. No token or a bad token → Sign In; a company → its own home.
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/signin?role=jobseeker', { replace: true })
      return
    }
    let ignore = false // stops a late answer from updating the page after leaving it

    async function load() {
      setLoading(true)
      setError('')

      // 1. Who is signed in?
      let user
      try {
        const data = await api('/auth/me')
        user = data.user
      } catch (err) {
        if (ignore) return
        // The server answered with an error (expired / invalid token) → sign in again
        if (err.error) navigate('/signin?role=jobseeker', { replace: true })
        else {
          setError('Could not reach the server')
          setLoading(false)
        }
        return
      }
      if (ignore) return
      // A company opened the job seeker page: send them to their own home
      if (user.role === 'employer') {
        navigate('/company', { replace: true })
        return
      }

      // 2. Their applications (newest first) + how many are in each status
      try {
        const data = await api('/applications')
        if (!ignore) {
          setApplications(data.applications)
          setCounts(data.counts)
        }
      } catch (err) {
        if (!ignore) setError(err.error || 'Could not reach the server')
      }
      if (!ignore) setLoading(false)
    }
    load()

    return () => {
      ignore = true
    }
  }, [navigate, reloadKey])

  const shown = tab === 'all' ? applications : applications.filter((application) => application.status === tab)
  const hasApplications = !loading && !error && applications.length > 0

  // ---------- What goes under the tabs
  let results
  if (loading) {
    results = <ApplicationsLoading />
  } else if (error) {
    results = (
      <div className="ma-state ma-state--error" role="alert">
        <h3>Could not load your applications</h3>
        <p>{error}</p>
        <button type="button" className="btn btn--outline" onClick={() => setReloadKey(reloadKey + 1)}>
          Try again
        </button>
      </div>
    )
  } else if (applications.length === 0) {
    results = (
      <div className="ma-state">
        <h3>No applications yet</h3>
        <p>When you apply for a job, it shows up here so you can follow its progress.</p>
        <Link to="/jobseeker/jobs" className="btn btn--outline">
          Find jobs
        </Link>
      </div>
    )
  } else if (shown.length === 0) {
    results = (
      <div className="ma-state">
        <h3>No {STATUS_LABELS[tab].toLowerCase()} applications</h3>
        <p>None of your applications is in this status right now.</p>
        <button type="button" className="btn btn--outline" onClick={() => setTab('all')}>
          Show all applications
        </button>
      </div>
    )
  } else {
    results = (
      <>
        <ul className="ma-list">
          {shown.map((application) => (
            <li key={application.id}>
              <ApplicationCard application={application} />
            </li>
          ))}
        </ul>
        {/* ---------- Legend ---------- */}
        <div className="ma-legend" aria-hidden="true">
          <span className="ma-legend__item">
            <span className="ma-legend__swatch ma-legend__swatch--done" />
            Done
          </span>
          <span className="ma-legend__item">
            <span className="ma-legend__swatch ma-legend__swatch--current" />
            Current step
          </span>
          <span className="ma-legend__item">
            <span className="ma-legend__swatch ma-legend__swatch--next" />
            Next
          </span>
        </div>
      </>
    )
  }

  return (
    <main className="container ma">
      <header className="ma-head">
        <h1 className="title">My applications</h1>
        <p className="muted">Click an application to see its details.</p>
      </header>

      {hasApplications && (
        <>
          {/* ---------- How many in each status ---------- */}
          <section className="ma-summary" aria-label="Applications by status">
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <div key={status} className={`ma-stat ma-stat--${status}`}>
                <strong className="ma-stat__count">{counts[status] ?? 0}</strong>
                <span className="ma-stat__label">{label}</span>
              </div>
            ))}
          </section>

          {/* ---------- Status tabs (only All shows its count, like the wireframe) ---------- */}
          <div className="ma-tabs" role="group" aria-label="Filter by status">
            {APPLICATION_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={tab === id ? 'ma-tab ma-tab--active' : 'ma-tab'}
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                {id === 'all' ? `${label} (${counts.all ?? applications.length})` : label}
              </button>
            ))}
          </div>
        </>
      )}

      {results}
    </main>
  )
}
