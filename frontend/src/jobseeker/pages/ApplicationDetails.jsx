import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../shared/api.js'
import Notice from '../../shared/components/Notice.jsx'
import StatusPill from '../../shared/components/StatusPill.jsx'
import { FileIcon } from '../../shared/components/icons.jsx'
import { formatJobType, formatWorkMode } from '../../shared/utils/jobFormat.js'
import CompanyLogo from '../components/CompanyLogo.jsx'
import {
  formatStatus,
  formatShortDate,
  formatFullDate,
  formatTime,
  formatInterviewType,
  timelineSteps
} from '../utils/applicationFormat.js'
import '../styles/ApplicationDetails.css'

// =====================================================================
// Application details (/jobseeker/applications/:id).
// One application: header, timeline, a panel for its status, and the CV that was sent.
// Data: GET /api/applications/:id → { application, history, interview, contact, feedback }
//   interview = only while the status is interview · contact = only when accepted
//   feedback  = only when rejected
// Interview replies: PATCH /api/applications/:id/interview { action: 'confirm' | 'reschedule' }
// =====================================================================

const isValidId = (id) => Number.isInteger(Number(id)) && Number(id) > 0

// CompanyLogo reads the same names a job has (company_id, company_name, company_logo)
const logoInfo = (application) => ({
  company_id: application.company_id,
  company_name: application.company_name,
  company_logo: application.logo_url
})

// ---------- Vertical timeline ----------
function Timeline({ application, history }) {
  return (
    <section className="ad-card">
      <h2 className="ad-card__title">Timeline</h2>
      <ol className={`ad-timeline ad-timeline--${application.status}`}>
        {timelineSteps(application, history).map((step) => (
          <li
            key={step.key}
            className={`ad-tl ad-tl--${step.state}`}
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            <span className="ad-tl__label">{step.label}</span>
            <span className="ad-tl__date">{step.date}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------- C · Interview ----------
// The line under the buttons once the seeker can't reply any more (same wording as the backend's messages)
const REPLY_STATE = {
  confirmed: 'You confirmed this interview.',
  reschedule_requested: 'You asked to reschedule. Wait for the new time.',
  done: 'This interview has already passed.'
}
// Backend "already replied" errors → the interview status they mean
const ERROR_STATUS = {
  'You already confirmed this interview': 'confirmed',
  'You already asked to reschedule. Wait for the new time.': 'reschedule_requested',
  'This interview has already passed': 'done'
}

// Online interviews have a meeting link; open it in a new tab
const isLink = (text) => /^https?:\/\//i.test(text || '')

function InterviewPanel({ applicationId, companyName, interview }) {
  const [status, setStatus] = useState(interview?.status)
  const [sending, setSending] = useState(null) // 'confirm' | 'reschedule' while the request is out
  const [notice, setNotice] = useState(null)

  if (!interview) {
    return (
      <section className="ad-panel ad-panel--interview">
        <h2 className="ad-panel__title">Interview details</h2>
        <p className="ad-panel__text">{companyName} has not shared the interview details yet.</p>
      </section>
    )
  }

  const passed = new Date(interview.scheduled_at) <= new Date()
  const stateText = passed ? REPLY_STATE.done : REPLY_STATE[status]
  // One reply only: after confirming or asking to reschedule, both buttons are off
  const canReply = status === 'invited' && !passed

  const reply = async (action) => {
    setSending(action)
    setNotice(null)
    try {
      const data = await api(`/applications/${applicationId}/interview`, { method: 'PATCH', body: { action } })
      setStatus(data.interview_status)
    } catch (err) {
      // Already replied (e.g. in another tab): show where it really is
      if (ERROR_STATUS[err.error]) setStatus(ERROR_STATUS[err.error])
      else setNotice({ type: 'error', text: err.error || 'Could not reach the server' })
    }
    setSending(null)
  }

  const where = interview.location_or_link
  return (
    <section className="ad-panel ad-panel--interview">
      <h2 className="ad-panel__title">Interview details</h2>
      <div className="ad-facts">
        <div className="ad-fact">
          <span className="ad-fact__label">Date</span>
          <span className="ad-fact__value">{formatFullDate(interview.scheduled_at)}</span>
        </div>
        <div className="ad-fact">
          <span className="ad-fact__label">Time</span>
          <span className="ad-fact__value">{formatTime(interview.scheduled_at)}</span>
        </div>
        <div className="ad-fact">
          <span className="ad-fact__label">Where</span>
          <span className="ad-fact__value">
            {isLink(where) ? (
              <a href={where} target="_blank" rel="noopener noreferrer">
                {where}
              </a>
            ) : (
              where
            )}
          </span>
        </div>
        <div className="ad-fact">
          <span className="ad-fact__label">Type</span>
          <span className="ad-fact__value">{formatInterviewType(interview.type)}</span>
        </div>
      </div>
      {interview.note_to_applicant && (
        <p className="ad-panel__text">
          Note from {companyName}: {interview.note_to_applicant}
        </p>
      )}
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <div className="ad-actions">
        <button
          type="button"
          className="btn ad-btn-interview"
          disabled={!canReply || sending !== null}
          onClick={() => reply('confirm')}
        >
          {sending === 'confirm' ? 'Sending…' : 'Confirm attendance'}
        </button>
        <button
          type="button"
          className="btn ad-btn-plain"
          disabled={!canReply || sending !== null}
          onClick={() => reply('reschedule')}
        >
          {sending === 'reschedule' ? 'Sending…' : 'Ask to reschedule'}
        </button>
      </div>
      {stateText && (
        <p className="ad-panel__state" role="status">
          {stateText}
        </p>
      )}
    </section>
  )
}

// ---------- E · Rejected ----------
// Bold the skill names the backend says are missing, wherever the company's reason mentions them
function withBoldSkills(text, skills) {
  const names = skills.filter(Boolean).sort((a, b) => b.length - a.length)
  if (names.length === 0) return text
  const escape = (name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // whole names only, so a skill like "C" doesn't bold every letter c
  const pattern = new RegExp(`(?<!\\w)(${names.map(escape).join('|')})(?!\\w)`, 'gi')
  return text.split(pattern).map((part, index) => (index % 2 ? <b key={index}>{part}</b> : part))
}

function RejectedPanel({ feedback }) {
  const missingRequired = feedback?.missingRequired || []
  const missingOther = feedback?.missingOther || []

  let reason
  if (feedback?.reason) {
    reason = withBoldSkills(feedback.reason, [...missingRequired, ...missingOther])
  } else if (missingRequired.length > 0) {
    // No reason written by the company: show the must-have skills the seeker doesn't have
    reason = (
      <>
        Missing must-have {missingRequired.length === 1 ? 'skill' : 'skills'}:{' '}
        {missingRequired.map((skill, index) => (
          <span key={skill}>
            {index > 0 && ', '}
            <b>{skill}</b>
          </span>
        ))}
        .
      </>
    )
  } else {
    reason = 'The company did not share a reason.'
  }

  return (
    <section className="ad-panel ad-panel--rejected">
      <h2 className="ad-panel__title">Why you were not selected</h2>
      <p className="ad-panel__text">{reason}</p>
      <Link to="/jobseeker/cv-optimizer" className="btn btn--primary">
        Improve my CV with AI
      </Link>
    </section>
  )
}

// ---------- The panel for the application's status ----------
function StatusPanel({ data }) {
  const { application, interview, contact, feedback } = data
  const company = application.company_name

  switch (application.status) {
    case 'applied':
      return (
        <section className="ad-panel ad-panel--applied">
          <h2 className="ad-panel__title">Application sent</h2>
          <p className="ad-panel__text">
            {company} is reviewing applications. We will notify you as soon as your status changes.
          </p>
          {application.job_is_open && application.deadline && (
            <p className="ad-panel__note">Applications close on {formatShortDate(application.deadline)}.</p>
          )}
        </section>
      )

    case 'shortlisted':
      return (
        <section className="ad-panel ad-panel--shortlisted">
          <h2 className="ad-panel__title">You are shortlisted!</h2>
          <p className="ad-panel__text">
            {company} picked you from the applicants. They may invite you to an interview soon, so keep your phone
            close.
          </p>
        </section>
      )

    case 'interview':
      return <InterviewPanel applicationId={application.id} companyName={company} interview={interview} />

    case 'accepted': {
      const contactLine = [contact?.email, contact?.phone].filter(Boolean).join(' · ')
      return (
        <section className="ad-panel ad-panel--accepted">
          <h2 className="ad-panel__title">Congratulations, you got the job!</h2>
          <p className="ad-panel__text">{company} will contact you about the offer and start date.</p>
          {contactLine && <p className="ad-panel__note">Contact: {contactLine}</p>}
        </section>
      )
    }

    case 'rejected':
      return <RejectedPanel feedback={feedback} />

    default:
      return null
  }
}

// ---------- What you sent ----------
function SentCard({ application }) {
  return (
    <section className="ad-card">
      <h2 className="ad-card__title">What you sent</h2>
      <div className="ad-file">
        <FileIcon />
        <span className="ad-file__name">{application.cv_file_name}</span>
        {application.score != null && <span className="ad-file__score">Match score {application.score}%</span>}
      </div>
      {/* Job details only opens open jobs, so the link is hidden once the job is closed */}
      {application.job_is_open && (
        <Link to={`/jobseeker/jobs/${application.job_id}`} className="ad-joblink">
          View the job post
        </Link>
      )}
    </section>
  )
}

export default function ApplicationDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  // status: 'loading' | 'ready' | 'notfound' | 'error'
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0) // "Try again" bumps this to load again

  // Load the signed-in user, then the application. No token or a bad token → Sign In; a company → its own home.
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/signin?role=jobseeker', { replace: true })
      return
    }
    let ignore = false // stops a late answer from updating the page after leaving it

    async function load() {
      setStatus('loading')
      setError('')

      // 1. Who is signed in?
      let user
      try {
        const me = await api('/auth/me')
        user = me.user
      } catch (err) {
        if (ignore) return
        // The server answered with an error (expired / invalid token) → sign in again
        if (err.error) navigate('/signin?role=jobseeker', { replace: true })
        else {
          setError('Could not reach the server')
          setStatus('error')
        }
        return
      }
      if (ignore) return
      // A company opened the job seeker page: send them to their own home
      if (user.role === 'employer') {
        navigate('/company', { replace: true })
        return
      }

      // 2. A wrong id in the URL (e.g. /jobseeker/applications/abc) → no need to ask the server
      if (!isValidId(id)) {
        setStatus('notfound')
        return
      }

      // 3. The application
      try {
        const result = await api(`/applications/${id}`)
        if (ignore) return
        setData(result)
        setStatus('ready')
      } catch (err) {
        if (ignore) return
        // api() only gives us the error message, not the status code.
        // The backend says "Application not found" for a missing id or someone else's application.
        if (err.error === 'Application not found' || err.error === 'Invalid application id') {
          setStatus('notfound')
        } else {
          setError(err.error || 'Could not reach the server')
          setStatus('error')
        }
      }
    }
    load()

    return () => {
      ignore = true
    }
  }, [id, navigate, reloadKey])

  const backLink = (
    <Link to="/jobseeker/applications" className="ad-back">
      ← Back to my applications
    </Link>
  )

  // ---------- Loading / not found / error ----------
  if (status === 'loading') {
    return (
      <main className="container ad">
        {backLink}
        <div className="ad-state" role="status">
          <span className="ad-spinner" aria-hidden="true" />
          Loading application…
        </div>
      </main>
    )
  }
  if (status === 'notfound') {
    return (
      <main className="container ad">
        {backLink}
        <div className="ad-state">
          <h2>Application not found</h2>
          <p>This application doesn't exist, or it isn't yours.</p>
          <Link to="/jobseeker/applications" className="btn btn--primary">
            See my applications
          </Link>
        </div>
      </main>
    )
  }
  if (status === 'error') {
    return (
      <main className="container ad">
        {backLink}
        <div className="ad-state ad-state--error" role="alert">
          <h2>Could not load this application</h2>
          <p>{error}</p>
          <button type="button" className="btn btn--outline" onClick={() => setReloadKey(reloadKey + 1)}>
            Try again
          </button>
        </div>
      </main>
    )
  }

  const { application, history } = data
  const meta = [
    application.company_name,
    formatJobType(application.job_type),
    formatWorkMode(application.work_mode),
    application.location,
    `Applied ${formatShortDate(application.applied_at)}`
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <main className="container ad">
      {backLink}

      {/* ---------- Header ---------- */}
      <section className="ad-card ad-header">
        <CompanyLogo job={logoInfo(application)} className="ad-logo" />
        <div className="ad-header__text">
          <h1 className="ad-header__title">{application.title}</h1>
          <p className="ad-header__meta">{meta}</p>
        </div>
        <span className="ad-header__status">
          <StatusPill status={formatStatus(application.status)} />
        </span>
      </section>

      <div className="ad-layout">
        <Timeline application={application} history={history} />
        <div className="ad-side">
          <StatusPanel data={data} />
          <SentCard application={application} />
        </div>
      </div>
    </main>
  )
}
