import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../shared/api.js'
import {
  formatJobType,
  formatWorkMode,
  formatSalary,
  formatDeadline,
  daysLeftText,
  matchTier,
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
  LockIcon,
  CheckIcon,
  SparkleIcon
} from '../../shared/components/icons.jsx'
import { ButtonSpinner } from '../../shared/components/Loading.jsx'
import { OPTIMIZER_PATH } from '../utils/cvFormat.js'
import '../styles/JobDetails.css'


// Same check the backend does: the id must be a whole number above 0
const isValidId = (id) => Number.isInteger(Number(id)) && Number(id) > 0

// "www.company.bh" , "https://www.company.bh" so the link opens the real site
const websiteUrl = (site) =>
  /^https?:\/\//i.test(site) ? site : `https://${site}`

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

// Big match ring in the header; the coloured part fills up when the page opens
// (circle length 2πr = 251.3 for r = 40). Same colours as the job lists:
// teal 80+, amber below 80, pale red (muted) = doesn't qualify.
function BigRing({ score, label, example, muted, title }) {
  const tone = example ? 'example' : muted ? 'muted' : matchTier(score)
  return (
    <div
      className={`jd-ring jd-ring--${tone}`}
      role="img"
      aria-label={example ? 'Example match score. Each job seeker sees their own score here.' : `${score}% match`}
      title={title}
    >
      <svg viewBox="0 0 96 96" aria-hidden="true">
        <circle className="jd-ring__track" cx="48" cy="48" r="40" />
        <circle
          className="jd-ring__bar"
          cx="48"
          cy="48"
          r="40"
          style={{ strokeDasharray: `${((score / 100) * 251.3).toFixed(1)} 251.3` }}
        />
      </svg>
      <div className="jd-ring__inner">
        <span className="jd-ring__value">{score}%</span>
        <span className="jd-ring__label">{label}</span>
      </div>
    </div>
  )
}

// Grey shapes in the same layout as the page, while the job loads 
function JobDetailsLoading() {
  const line = (width, thin) => (
    <span className={thin ? 'sk sk--line sk--thin' : 'sk sk--line'} style={{ width }} />
  )
  return (
    <div className="jd-loading" role="status" aria-label="Loading job">
      <section className="jd-card jd-hero" aria-hidden="true">
        <span className="sk jd-logo" />
        <div className="jd-hero__text">
          {line('50%')}
          {line('30%', true)}
          <div className="jd-tags">
            <span className="sk sk--pill" />
            <span className="sk sk--pill" />
            <span className="sk sk--pill" />
          </div>
        </div>
        <span className="sk jd-sk-ring" />
      </section>
      <div className="jd-layout" aria-hidden="true">
        <div className="jd-main">
          {[0, 1].map((i) => (
            <section key={i} className="jd-card">
              {line('35%')}
              {line('95%', true)}
              {line('85%', true)}
              {line('60%', true)}
            </section>
          ))}
        </div>
        <div className="jd-side">
          <section className="jd-card jd-apply">
            {line('60%')}
            <span className="sk jd-sk-cv" />
            <span className="sk sk--wide" />
          </section>
        </div>
      </div>
    </div>
  )
}

export default function JobDetails({ preview = false }) {
  const { id } = useParams() // the job id from the URL
  const navigate = useNavigate()
  const location = useLocation()
  const [justApplied, setJustApplied] = useState(false) // applied on this visit

  // opening a job from a list scrolled down → start the job page at the top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [id])

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

  // "Back" returns to the list the job was opened from (All jobs keeps its filters and page);
  // opened some other way (a link, a refresh) → Jobs for you.
  // In preview the "Exit preview" button takes the company back, so no back link there
  const from = location.state?.from
  let backLabel = 'Back to jobs'
  if (from?.startsWith('/jobseeker/jobs/all')) backLabel = 'Back to All jobs'
  else if (from?.startsWith('/jobseeker/jobs')) backLabel = 'Back to Jobs for you'
  else if (from?.startsWith('/jobseeker/companies')) backLabel = 'Back to the company'
  const backLink = preview ? null : (
    <Link to={from || '/jobseeker/jobs'} state={{ restoreScroll: true }} className="jd-back">
      ← {backLabel}
    </Link>
  )

  // ---------- Loading / not found / error ----------
  if (status === 'loading') {
    return (
      <main className="container jd">
        {backLink}
        <JobDetailsLoading />
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

  //  Values worked out from the job 
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
      const { application } = await api(`/jobs/${id}/apply`, { method: 'POST' })
      // the box switches to "Application sent"
      setJustApplied(true)
      setMe((m) => ({ ...m, application_status: 'applied', application_id: application?.id }))
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
            </span>
          </div>
        </div>
        
        {/* seeker: their real score (if any) · preview: an example */}
        {preview ? (
          <BigRing
            score={85}
            label="example"
            example
            title="Each job seeker sees their own match score here"
          />
        ) : (
          me?.match_score != null && (
            <BigRing score={me.match_score} label="match" muted={me.is_qualified === false} />
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
            {(preview || !me?.application_status) && (
              <h2 className="jd-card__title">Apply for this job</h2>
            )}

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
              // applied (just now, or before) → where to follow it
              <div className="jd-sent">
                <div className="jd-sent__head">
                  <span className="jd-sent__icon">
                    <CheckIcon />
                  </span>
                  <div>
                    <h2 className="jd-sent__title">
                      {justApplied ? 'Application sent' : 'You applied'}
                    </h2>
                    <p className="jd-sent__state">
                      Status
                      <span className={`jd-sent__pill jd-sent__pill--${me.application_status}`}>
                        {capitalize(me.application_status)}
                      </span>
                    </p>
                  </div>
                </div>
                <p className="jd-sent__text">
                  {job.company_name} will see your CV. We will notify you when your status changes.
                </p>
                <Link
                  to={
                    me.application_id
                      ? `/jobseeker/applications/${me.application_id}`
                      : '/jobseeker/applications'
                  }
                  className="jd-sent__btn"
                >
                  Track in My applications
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
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
                  aria-busy={applying}
                  onClick={handleApply}
                >
                  {applying ? (
                    <>
                      <ButtonSpinner />
                      Applying…
                    </>
                  ) : (
                    'Apply with my CV'
                  )}
                </button>
                {applyError && (
                  <p className="jd-apply__note" role="alert">
                    {applyError}
                  </p>
                )}
                {me?.cv_file_name ? (
                  <Link to={OPTIMIZER_PATH} className="jd-apply__link">
                    <SparkleIcon />
                    Improve my CV first
                  </Link>
                ) : (
                  <Link to="/jobseeker/profile" className="jd-apply__link">
                    Upload a CV in your profile
                  </Link>
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
