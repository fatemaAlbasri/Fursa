import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../shared/api.js'
import { formatJobType, formatWorkMode, formatDeadline } from '../utils/jobFormat.js'
import CompanyLogo from '../components/CompanyLogo.jsx'
import '../styles/Companies.css'

// ---------- Small icon used on this page ----------
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

// Account date → "Sep 2026" (en-US, because en-GB writes "Sept")
const formatMonthYear = (date) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

// "Manama" → "Manama, Bahrain" (all companies on Fursa are in Bahrain)
const withCountry = (location) => (/bahrain/i.test(location) ? location : `${location}, Bahrain`)

// ["React", "Git"] → React and Git, ["A", "B", "C"] → A, B and C (each name in bold)
function SkillList({ names }) {
  return names.map((name, i) => (
    <span key={name}>
      {i > 0 && (i === names.length - 1 ? ' and ' : ', ')}
      <strong>{name}</strong>
    </span>
  ))
}

// Best match first; jobs without a score yet go last (the backend sends them in this order too)
const byMatch = (a, b) => (b.match_score ?? -1) - (a.match_score ?? -1)

// CompanyLogo reads the same names a job has (company_id, company_name, company_logo)
const logoInfo = (company) => ({
  company_id: company.id,
  company_name: company.name,
  company_logo: company.logo_url
})

// One open job: match ring (only when there is a score), title, type, mode, deadline
function JobRow({ job }) {
  return (
    <article className="co-job">
      {job.match_score != null && (
        <div className="co-ring" style={{ '--score': job.match_score }} aria-label={`${job.match_score}% match`}>
          <span className="co-ring__value">{job.match_score}%</span>
        </div>
      )}
      <div className="co-job__info">
        <h3 className="co-job__title">{job.title}</h3>
        <p className="co-job__meta">
          <span className={job.job_type === 'internship' ? 'co-tag co-tag--internship' : 'co-tag'}>
            {formatJobType(job.job_type)}
          </span>
          <span>
            {formatWorkMode(job.work_mode)} · Deadline {formatDeadline(job.deadline)}
          </span>
        </p>
      </div>
      <Link to={`/jobseeker/jobs/${job.id}`} className="btn btn--primary co-job__btn">
        View &amp; apply
      </Link>
    </article>
  )
}

// "How to stand out here": the skills the company asks for most, and which ones the seeker is missing.
// The backend only knows the skills saved in the seeker's profile, so the text talks about
// "your skills" (not the CV), and says "often" only when a skill is asked for in more than one job.
function StandOut({ company, skills }) {
  const names = skills.map((skill) => skill.name)
  const missing = skills.filter((skill) => !skill.seeker_has).map((skill) => skill.name)
  const often = skills.some((skill) => skill.jobs_asking > 1)

  return (
    <section className="co-section co-tip">
      <h2 className="co-section__title">How to stand out here</h2>
      <p className="co-tip__text">
        {company.name} {often ? 'often asks' : 'asks'} for <SkillList names={names} />.{' '}
        {missing.length === 0 ? (
          'You already have these in your skills, so make sure your CV shows them clearly.'
        ) : (
          <>
            <SkillList names={missing} /> {missing.length === 1 ? 'is' : 'are'} not in your skills yet.
          </>
        )}
      </p>
      {/* The AI CV Optimizer isn't built yet → the button stays disabled */}
      <button type="button" className="btn btn--block" disabled title="Coming soon">
        Improve my CV with AI
      </button>
      <p className="co-tip__text">The AI CV Optimizer is coming soon.</p>
    </section>
  )
}

export default function CompanyDetails() {
  const { id } = useParams() // the company id from the URL
  const navigate = useNavigate()

  // status: 'loading' | 'ready' | 'notfound' | 'error'
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [company, setCompany] = useState(null)
  const [jobs, setJobs] = useState([])
  const [standOut, setStandOut] = useState([])
  const [reloadKey, setReloadKey] = useState(0) // "Try again" bumps this to load again

  // Load the signed-in user, then this company. No token or a bad token → Sign In; a company → its own home.
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

      // 2. A wrong id in the URL (e.g. /jobseeker/companies/abc) → no need to ask the server
      if (!isValidId(id)) {
        setStatus('notfound')
        return
      }

      // 3. The company, its open jobs and the stand-out tips
      try {
        const data = await api(`/companies/${id}`)
        if (ignore) return
        setCompany(data.company)
        setJobs([...data.jobs].sort(byMatch))
        setStandOut(data.stand_out || [])
        setStatus('ready')
      } catch (err) {
        if (ignore) return
        // api() only gives us the error message, not the status code
        if (err.error === 'Company not found' || err.error === 'Invalid company id') {
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
    <Link to="/jobseeker/companies" className="co-back">
      ← All companies
    </Link>
  )

  // ---------- Loading / not found / error ----------
  if (status === 'loading') {
    return (
      <main className="container co">
        {backLink}
        <div className="co-state" role="status">
          <span className="co-spinner" aria-hidden="true" />
          Loading company…
        </div>
      </main>
    )
  }
  if (status === 'notfound') {
    return (
      <main className="container co">
        {backLink}
        <div className="co-state">
          <h2>Company not found</h2>
          <p>This company doesn't exist or is no longer on Fursa.</p>
          <Link to="/jobseeker/companies" className="btn btn--primary">
            See all companies
          </Link>
        </div>
      </main>
    )
  }
  if (status === 'error') {
    return (
      <main className="container co">
        {backLink}
        <div className="co-state co-state--error" role="alert">
          <h2>Could not load this company</h2>
          <p>{error}</p>
          <button type="button" className="btn btn--outline" onClick={() => setReloadKey(reloadKey + 1)}>
            Try again
          </button>
        </div>
      </main>
    )
  }

  // "Sorted by your match" only makes sense when at least one job has a score
  const hasScores = jobs.some((job) => job.match_score != null)

  return (
    <main className="container co">
      {backLink}

      {/* ---------- Header ---------- */}
      <section className="co-hero">
        <div className="co-hero__banner" />
        <div className="co-hero__body">
          <CompanyLogo job={logoInfo(company)} className="co-logo" />
          <div className="co-hero__text">
            <h1>{company.name}</h1>
            <p className="co-hero__meta">
              <span>{company.industry}</span>
              <span>{withCountry(company.location)}</span>
              {company.member_since && <span>On Fursa since {formatMonthYear(company.member_since)}</span>}
            </p>
          </div>
          {company.website && (
            <a
              href={websiteUrl(company.website)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--outline co-website"
            >
              {GlobeIcon}
              Visit website
            </a>
          )}
        </div>
      </section>

      <div className="co-layout">
        {/* ---------- Left: about + open jobs ---------- */}
        <div className="co-main">
          <section className="co-section">
            <h2 className="co-section__title">About {company.name}</h2>
            <p className="co-text">{company.about || "This company hasn't added a description yet."}</p>
          </section>

          <section className="co-section">
            <div className="co-section__head">
              <h2 className="co-section__title">
                Open jobs <small>({jobs.length})</small>
              </h2>
              {hasScores && <span className="pill">Sorted by your match</span>}
            </div>

            {jobs.length > 0 ? (
              <div className="co-jobs">
                {jobs.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <div className="co-state">
                <h3>No open jobs right now</h3>
                <p>{company.name} has no open jobs or internships at the moment. Check back soon.</p>
              </div>
            )}
          </section>
        </div>

        {/* ---------- Right: company info + tips ---------- */}
        <aside className="co-side">
          <section className="co-section">
            <h2 className="co-section__title">Company info</h2>
            <div className="co-info">
              <div className="co-info__item">
                <span className="co-info__label">Industry</span>
                <span className="co-info__value">{company.industry}</span>
              </div>
              <div className="co-info__item">
                <span className="co-info__label">Location</span>
                <span className="co-info__value">{company.location}</span>
              </div>
              {company.website && (
                <div className="co-info__item">
                  <span className="co-info__label">Website</span>
                  <a
                    href={websiteUrl(company.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="co-info__value"
                  >
                    {company.website}
                  </a>
                </div>
              )}
              <div className="co-info__item">
                <span className="co-info__label">Jobs posted on Fursa</span>
                <span className="co-info__value">
                  {company.open_jobs} open · {company.closed_jobs} closed
                </span>
              </div>
            </div>
          </section>

          {standOut.length > 0 && <StandOut company={company} skills={standOut} />}
        </aside>
      </div>
    </main>
  )
}
