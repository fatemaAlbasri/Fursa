import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../shared/api.js'
import {
  formatJobType,
  formatWorkMode,
  formatSalary,
  formatDeadline,
  daysLeftText,
  formatExperience,
  splitLines
} from '../utils/jobFormat.js'
import CompanyLogo from '../components/CompanyLogo.jsx'
import '../styles/JobDetails.css'

// ---------- Small icons used on this page ----------
const FileIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </svg>
)
const GlobeIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
  </svg>
)

// Same check the backend does: the id must be a whole number above 0
const isValidId = (id) => Number.isInteger(Number(id)) && Number(id) > 0

// "www.company.bh" → "https://www.company.bh" so the link opens the real site
const websiteUrl = (site) => (/^https?:\/\//i.test(site) ? site : `https://${site}`)

// "shortlisted" → "Shortlisted"
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

// A small box: label on top, value under it, with a ✓ when the seeker meets it
function Requirement({ label, value, ok }) {
  return (
    <div className="jd-req">
      <span className="jd-req__label">{label}</span>
      <span className="jd-req__value">
        {value}
        {ok && <span className="jd-req__ok" aria-label="You meet this">✓</span>}
      </span>
    </div>
  )
}

export default function JobDetails() {
  const { id } = useParams() // the job id from the URL
  const navigate = useNavigate()

  // status: 'loading' | 'ready' | 'notfound' | 'error'
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [job, setJob] = useState(null)
  const [me, setMe] = useState(null) // the seeker's own info for this job (can be null)
  const [reloadKey, setReloadKey] = useState(0) // "Try again" bumps this to load again

  // Load the signed-in user, then this job. No token or a bad token → Sign In.
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
        const data = await api('/auth/me')
        user = data.user
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

      // 2. A wrong id in the URL (e.g. /jobseeker/jobs/abc) → no need to ask the server
      if (!isValidId(id)) {
        setStatus('notfound')
        return
      }

      // 3. The job + the seeker's info for it
      try {
        const data = await api(`/jobs/${id}`)
        if (ignore) return
        setJob(data.job)
        setMe(data.me)
        setStatus('ready')
      } catch (err) {
        if (ignore) return
        // api() only gives us the error message, not the status code.
        // The backend says "Job not found" for missing, closed and expired jobs.
        if (err.error === 'Job not found' || err.error === 'Invalid job id') {
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
    <Link to="/jobseeker/jobs" className="jd-back">
      ← Back to jobs
    </Link>
  )

  // ---------- Loading / not found / error ----------
  if (status === 'loading') {
    return (
      <main className="container jd">
        {backLink}
        <div className="jd-card jd-state" role="status">
          <span className="jd-spinner" aria-hidden="true" />
          Loading job…
        </div>
      </main>
    )
  }
  if (status === 'notfound') {
    return (
      <main className="container jd">
        {backLink}
        <div className="jd-card jd-state">
          <h2>Job not found</h2>
          <p>This job doesn't exist, or it is closed or past its deadline.</p>
          <Link to="/jobseeker/jobs" className="btn btn--primary">
            See open jobs
          </Link>
        </div>
      </main>
    )
  }
  if (status === 'error') {
    return (
      <main className="container jd">
        {backLink}
        <div className="jd-card jd-state jd-state--error" role="alert">
          <h2>Could not load this job</h2>
          <p>{error}</p>
          <button type="button" className="btn btn--outline" onClick={() => setReloadKey(reloadKey + 1)}>
            Try again
          </button>
        </div>
      </main>
    )
  }

  // ---------- Values worked out from the job ----------
  const salary = formatSalary(job.salary)
  const left = daysLeftText(job.days_left)
  const responsibilities = splitLines(job.responsibilities)
  // Must-have skills first, then the rest
  const skills = [...job.skills].sort((a, b) => b.is_required - a.is_required)
  const mySkillIds = me?.skill_ids || []

  // ✓ only when we can be sure from the seeker's profile
  const majorOk = Boolean(me?.major && job.field && me.major.trim().toLowerCase() === job.field.trim().toLowerCase())
  const experienceOk = me?.years_experience != null && Number(me.years_experience) >= job.min_years

  return (
    <main className="container jd">
      {backLink}

      {/* ---------- Header ---------- */}
      <section className="jd-card jd-hero">
        <CompanyLogo job={job} className="jd-logo" />
        <div className="jd-hero__text">
          <h1>{job.title}</h1>
          <p className="jd-hero__company">
            {job.company_name} · {job.location}
          </p>
          <div className="jd-tags">
            <span className={job.job_type === 'internship' ? 'jd-tag jd-tag--internship' : 'jd-tag'}>
              {formatJobType(job.job_type)}
            </span>
            <span className="jd-tag jd-tag--plain">{formatWorkMode(job.work_mode)}</span>
            <span className="jd-tag jd-tag--plain">{salary ? `${salary} / month` : 'Salary not shown'}</span>
            <span className="jd-tag jd-tag--deadline">
              Deadline {formatDeadline(job.deadline)}
              {left && ` · ${left}`}
            </span>
          </div>
        </div>

        {/* Match ring: only when the backend has a score for this seeker and job */}
        {me?.match_score != null && (
          <div className="jd-ring" style={{ '--score': me.match_score }} aria-label={`${me.match_score}% match`}>
            <div className="jd-ring__inner">
              <span className="jd-ring__value">{me.match_score}%</span>
              <span className="jd-ring__label">match</span>
            </div>
          </div>
        )}
      </section>

      <div className="jd-layout">
        {/* ---------- Left: job details ---------- */}
        <div className="jd-main">
          <section className="jd-card">
            <h2 className="jd-card__title">About the job</h2>
            <p className="jd-text">{job.description}</p>
          </section>

          {responsibilities.length > 0 && (
            <section className="jd-card">
              <h2 className="jd-card__title">Role &amp; responsibilities</h2>
              <ul className="jd-list">
                {responsibilities.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="jd-card">
            <h2 className="jd-card__title">Requirements &amp; your match</h2>

            {skills.length > 0 && (
              <div className="jd-skills">
                {skills.map((skill) => {
                  // me is null when the seeker has no profile yet → we can't compare
                  const has = me ? mySkillIds.includes(skill.id) : null
                  const boxClass = has === null ? 'jd-skill' : has ? 'jd-skill jd-skill--have' : 'jd-skill jd-skill--missing'
                  return (
                    <div key={skill.id} className={boxClass}>
                      <span className="jd-skill__name">
                        {skill.name}
                        {skill.is_required && <span className="jd-must">Must-have</span>}
                      </span>
                      {has !== null && (
                        <span className="jd-skill__status">{has ? '✓ You have it' : '– Not in your skills'}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="jd-reqs">
              {job.field && (
                <Requirement
                  label={job.major_must_have ? 'Major (must-have)' : 'Major'}
                  value={job.field}
                  ok={majorOk}
                />
              )}
              <Requirement label="Experience" value={formatExperience(job.min_years, job.max_years)} ok={experienceOk} />
              {job.language && <Requirement label="Language" value={job.language} ok={false} />}
            </div>
            {job.language && <p className="jd-note">Languages aren't checked against your profile yet.</p>}
          </section>
        </div>

        {/* ---------- Right: apply + company ---------- */}
        <aside className="jd-side">
          <section className="jd-card jd-apply">
            <h2 className="jd-card__title">Apply for this job</h2>

            {me?.application_status ? (
              // Already applied (from the backend) → show where the application is
              <p className="jd-apply__status">You applied · {capitalize(me.application_status)}</p>
            ) : (
              <>
                <div className="jd-cv">
                  {FileIcon}
                  {me?.cv_file_name ? (
                    <div>
                      <p className="jd-cv__name">{me.cv_file_name}</p>
                      <p className="jd-cv__sub">Your CV from your profile</p>
                    </div>
                  ) : (
                    <div>
                      <p className="jd-cv__name">No CV uploaded yet</p>
                      <p className="jd-cv__sub">You'll need a CV to apply</p>
                    </div>
                  )}
                </div>
                {/* No application endpoint in the backend yet → the button stays disabled */}
                <button type="button" className="btn btn--block" disabled>
                  Applying coming soon
                </button>
                <p className="jd-apply__note">Online applications aren't available on Fursa yet.</p>
              </>
            )}
          </section>

          <section className="jd-card">
            <h2 className="jd-card__title">About {job.company_name}</h2>
            <p className="jd-company__meta">
              {job.company_industry} · {job.company_location}
            </p>
            {job.company_about && <p className="jd-text">{job.company_about}</p>}
            {job.company_website && (
              <a
                href={websiteUrl(job.company_website)}
                target="_blank"
                rel="noopener noreferrer"
                className="jd-company__link"
              >
                {GlobeIcon}
                {job.company_website}
              </a>
            )}
          </section>
        </aside>
      </div>
    </main>
  )
}
