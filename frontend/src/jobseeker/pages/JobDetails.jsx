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
} from '../../shared/utils/jobFormat.js'
import CompanyLogo from '../components/CompanyLogo.jsx'
import {
  FileIcon,
  GlobeIcon,
  EyeIcon,
  PinIcon,
  BriefcaseIcon,
  LockIcon
} from '../../shared/components/icons.jsx'
import '../styles/JobDetails.css'


// Same check the backend does: the id must be a whole number above 0
const isValidId = (id) => Number.isInteger(Number(id)) && Number(id) > 0

// "www.company.bh" → "https://www.company.bh" so the link opens the real site
const websiteUrl = (site) =>
  /^https?:\/\//i.test(site) ? site : `https://${site}`

// "shortlisted" → "Shortlisted"
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

// A small box: label on top, value under it, with a ✓ when the seeker meets it
function Requirement({ label, value, ok }) {
  return (
    <div className="jd-req">
      <span className="jd-req__label">{label}</span>
      <span className="jd-req__value">
        {value}
        {ok && (
          <span className="jd-req__ok" aria-label="You meet this">
            ✓
          </span>
        )}
      </span>
    </div>
  )
}

export default function JobDetails({ preview = false }) {
  const { id } = useParams() // the job id from the URL
  const navigate = useNavigate()

  // status: 'loading' | 'ready' | 'notfound' | 'error'
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [job, setJob] = useState(null)
  const [me, setMe] = useState(null) // the seeker's own info for this job (can be null)
  const [reloadKey, setReloadKey] = useState(0) // "Try again" bumps this to load again
  const [applying, setApplying] = useState(false) // true while the request is being sent
  const [applyError, setApplyError] = useState('')

  // Load the signed-in user, then this job. No token or a bad token → Sign In.
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate(preview ? '/signin?role=company' : '/signin?role=jobseeker', {
        replace: true
      })
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
        if (err.error) navigate(preview ? '/signin?role=company' : '/signin?role=jobseeker', { replace: true })
        else {
          setError('Could not reach the server')
          setStatus('error')
        }
        return
      }
      if (ignore) return
      // A company opened the job seeker page: send them to their own home
      if (!preview && user.role === 'employer') {
        navigate('/company', { replace: true })
        return
      }
      // only companies can open the preview
      if (preview && user.role !== 'employer') {
        navigate('/jobseeker/jobs', { replace: true })
        return
      }

      // 2. A wrong id in the URL (e.g. /jobseeker/jobs/abc) → no need to ask the server
      if (!isValidId(id)) {
        setStatus('notfound')
        return
      }

      // 3. The job + the seeker's info for it
      try {
        const data = await api(preview ? `/jobs/mine/${id}` : `/jobs/${id}`)
        if (ignore) return
        setJob(data.job)
        setMe(preview ? null : data.me) // no seeker in preview → no match info
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
  }, [id, navigate, reloadKey, preview])

  // In preview the "Exit preview" button takes the company back, so no back link there
  const backLink = preview ? null : (
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
          <Link
            to={preview ? '/company/jobs' : '/jobseeker/jobs'}
            className="btn btn--primary"
          >
            {preview ? 'Back to your jobs' : 'See open jobs'}
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
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => setReloadKey(reloadKey + 1)}
          >
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
  const majorOk =
    preview ||
    Boolean(
      me?.major &&
      job.field &&
      me.major.trim().toLowerCase() === job.field.trim().toLowerCase()
    )
  const experienceOk =
    preview ||
    (me?.years_experience != null &&
      Number(me.years_experience) >= job.min_years)

  // Skill status: true = has it, false = missing, null = can't tell.
  // Preview example: every skill "has it" except the last one, so both looks are shown.
  const skillStatus = (skill, index) => {
    if (preview) return skills.length < 2 || index < skills.length - 1
    return me ? mySkillIds.includes(skill.id) : null
  }

  // Apply with the CV from the seeker's profile
  const handleApply = async () => {
    setApplying(true)
    setApplyError('')
    try {
      await api(`/jobs/${id}/apply`, { method: 'POST' })
      // the box switches to "You applied · Applied"
      setMe((m) => ({ ...m, application_status: 'applied' }))
    } catch (err) {
      if (err.error === 'You already applied to this job') {
        setMe((m) => ({ ...m, application_status: 'applied' }))
      } else {
        setApplyError(err.error || 'Could not reach the server')
      }
    } finally {
      setApplying(false)
    }
  }

  return (
    <main className="container jd">
      {backLink}

      {preview && (
        <div className="jd-preview" role="note">
          <span className="jd-preview__icon"><EyeIcon /></span>
          <div className="jd-preview__text">
            <b>Preview mode</b>
            <span>
              This is how job seekers see your job. Applying is turned off here.
              {job.status === 'draft' &&
                ' This job is a draft, so job seekers can’t see it yet.'}
            </span>
          </div>
          <Link to={`/company/jobs/${id}`} className="jd-preview__exit">
            Exit preview
          </Link>
        </div>
      )}

      {/* ---------- Header ---------- */}
      <section className="jd-card jd-hero">
        <CompanyLogo job={job} className="jd-logo" />
        <div className="jd-hero__text">
          <h1>{job.title}</h1>
          <p className="jd-hero__company">
            {preview ? (
              <span>{job.company_name}</span>
            ) : (
              <Link
                to={`/jobseeker/companies/${job.company_id}`}
                className="jd-hero__link"
              >
                {job.company_name}
              </Link>
            )}{' '}
            · {job.location}
          </p>
          <div className="jd-tags">
            <span
              className={
                job.job_type === 'internship'
                  ? 'jd-tag jd-tag--internship'
                  : 'jd-tag'
              }
            >
              <BriefcaseIcon />
              {formatJobType(job.job_type)}
            </span>
            <span className="jd-tag">
              <PinIcon />
              {formatWorkMode(job.work_mode)}
            </span>
            <span className="jd-tag jd-tag--plain">
              {salary ? `${salary} / month` : 'Salary not shown'}
            </span>
            <span className="jd-tag jd-tag--deadline">
              Deadline {formatDeadline(job.deadline)}
              {left && ` · ${left}`}
            </span>
          </div>
        </div>
        
        {/* seeker: their real score (if any) · preview: an example */}
        {preview ? (
          <div
            className="jd-ring jd-ring--example"
            style={{ '--score': 85 }}
            aria-label="Example match score. Each job seeker sees their own score here."
            title="Each job seeker sees their own match score here"
          >
            <div className="jd-ring__inner">
              <span className="jd-ring__value">85%</span>
              <span className="jd-ring__label">example</span>
            </div>
          </div>
        ) : (
          me?.match_score != null && (
            <div
              className="jd-ring"
              style={{ '--score': me.match_score }}
              aria-label={`${me.match_score}% match`}
            >
              <div className="jd-ring__inner">
                <span className="jd-ring__value">{me.match_score}%</span>
                <span className="jd-ring__label">match</span>
              </div>
            </div>
          )
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
            {preview && (
              <p className="jd-note jd-note--teal">
                Each job seeker sees this with their own skills. Below is an
                example.
              </p>
            )}

            {skills.length > 0 && (
              <div className="jd-skills">
                {skills.map((skill, index) => {
                  const has = skillStatus(skill, index)
                  const boxClass =
                    has === null
                      ? 'jd-skill'
                      : has
                        ? 'jd-skill jd-skill--have'
                        : 'jd-skill jd-skill--missing'
                  return (
                    <div key={skill.id} className={boxClass}>
                      <span className="jd-skill__name">
                        {skill.name}
                        {skill.is_required && (
                          <span className="jd-must">Must-have</span>
                        )}
                      </span>
                      {has !== null && (
                        <span className="jd-skill__status">
                          {has ? '✓ You have it' : '– Not in your skills'}
                        </span>
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
              <Requirement
                label="Experience"
                value={formatExperience(job.min_years, job.max_years)}
                ok={experienceOk}
              />
              {job.language && (
                <Requirement
                  label="Language"
                  value={job.language}
                  ok={preview}
                />
              )}
            </div>
            {job.language && !preview && (
              <p className="jd-note">
                Languages aren't checked against your profile yet.
              </p>
            )}
          </section>
        </div>

        {/* ---------- Right: apply + company ---------- */}
        <aside className="jd-side">
          <section className="jd-card jd-apply">
            <h2 className="jd-card__title">Apply for this job</h2>

            {preview ? (
              // preview: show what a seeker sees, but the button does nothing
              <>
                <div className="jd-cv">
                  <FileIcon />
                  <div>
                    <p className="jd-cv__name">their_cv.pdf</p>
                    <p className="jd-cv__sub">
                      Job seekers apply with the CV from their profile
                    </p>
                  </div>
                </div>
                <button type="button" className="btn btn--block" disabled>
                  Apply with my CV
                </button>
                <p className="jd-apply__off">
                  <LockIcon /> Turned off in preview
                </p>
              </>
            ) : me?.application_status ? (
              // Already applied (from the backend) → show where the application is
              <p className="jd-apply__status">
                You applied · {capitalize(me.application_status)}
              </p>
            ) : (
              <>
                <div className="jd-cv">
                  <FileIcon />
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
                <button
                  type="button"
                  className="btn btn--block"
                  disabled={!me?.cv_file_name || applying}
                  onClick={handleApply}
                >
                  {applying ? 'Sending…' : 'Apply with my CV'}
                </button>
                {applyError && (
                  <p className="jd-apply__note" role="alert">
                    {applyError}
                  </p>
                )}
              </>
            )}
          </section>

          <section className="jd-card">
            <h2 className="jd-card__title">About {job.company_name}</h2>
            <p className="jd-company__meta">
              {job.company_industry} · {job.company_location}
            </p>
            {job.company_about && (
              <p className="jd-text">{job.company_about}</p>
            )}
            {job.company_website && (
              <a
                href={websiteUrl(job.company_website)}
                target="_blank"
                rel="noopener noreferrer"
                className="jd-company__link"
              >
                <GlobeIcon />
                {job.company_website}
              </a>
            )}
            {preview ? (
              // preview: looks the same, but does nothing
              <button
                type="button"
                className="jd-company__btn jd-company__btn--off"
                disabled
                title="Not available in preview"
              >
                <LockIcon />
                View company page
              </button>
            ) : (
              <Link
                to={`/jobseeker/companies/${job.company_id}`}
                className="jd-company__btn"
              >
                View company page
              </Link>
            )}
          </section>
        </aside>
      </div>
    </main>
  )
}
