import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api.js'
import {
  formatJobType,
  formatWorkMode,
  formatSalary,
  formatDeadline,
  daysLeft,
  daysLeftText,
  greeting
} from '../utils/jobFormat.js'
import CompanyLogo from '../components/CompanyLogo.jsx'
import '../styles/JobsForYou.css'

// Job types the backend allows (jobs.job_type in schema.sql)
const JOB_TYPES = ['full_time', 'part_time', 'internship']

const EMPTY_FILTERS = { search: '', type: '', field: '', location: '' }

// Unique, sorted, non-empty values of one job column (for the Field / Location menus)
const optionsFrom = (jobs, key) =>
  [...new Set(jobs.map((job) => job[key]).filter(Boolean))].sort()

function JobCard({ job, index }) {
  const salary = formatSalary(job.salary)
  const left = daysLeftText(daysLeft(job.deadline))

  return (
    // index staggers the fade-in a little, card by card
    <article className="jfy-card" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <div className="jfy-card__top">
        <CompanyLogo job={job} className="jfy-logo" />
        <div>
          <h3 className="jfy-card__title">{job.title}</h3>
          <p className="jfy-card__company">
            {job.company_name} · {job.location}
          </p>
        </div>
      </div>

      <div className="jfy-tags">
        <span className={job.job_type === 'internship' ? 'jfy-tag jfy-tag--internship' : 'jfy-tag'}>
          {formatJobType(job.job_type)}
        </span>
        <span className="jfy-tag jfy-tag--plain">{formatWorkMode(job.work_mode)}</span>
        {job.field && <span className="jfy-tag jfy-tag--plain">{job.field}</span>}
      </div>

      <p className="jfy-card__meta">
        <span>{salary ? `${salary} / month` : 'Salary not shown'}</span>
        <span>
          Deadline {formatDeadline(job.deadline)}
          {left && ` · ${left}`}
        </span>
      </p>

      <Link to={`/jobseeker/jobs/${job.id}`} className="btn btn--primary btn--block">
        View &amp; apply
      </Link>
    </article>
  )
}

export default function JobsForYou() {
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [reloadKey, setReloadKey] = useState(0) // "Try again" bumps this to load again

  // Load the signed-in user, then the open jobs. No token or a bad token → Sign In.
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
      setFirstName(user.first_name)

      // 2. The open jobs
      try {
        const data = await api('/jobs')
        if (!ignore) setJobs(data.jobs)
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

  const change = (e) => setFilters({ ...filters, [e.target.name]: e.target.value })

  // Search + filters are applied here in the browser (the backend returns all open jobs)
  const search = filters.search.trim().toLowerCase()
  const shown = jobs.filter(
    (job) =>
      (!search ||
        job.title.toLowerCase().includes(search) ||
        job.company_name.toLowerCase().includes(search)) &&
      (!filters.type || job.job_type === filters.type) &&
      (!filters.field || job.field === filters.field) &&
      (!filters.location || job.location === filters.location)
  )
  const filtering = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  return (
    <main className="container jfy">
      <header className="jfy-head">
        <h1 className="title">
          {greeting()}
          {firstName && `, ${firstName}`}
        </h1>
        <p className="muted">Here are the latest open jobs and internships.</p>
      </header>

      <section className="card jfy-filters" aria-label="Search and filters">
        <div className="field">
          <label htmlFor="jfy-search">Search</label>
          <input
            id="jfy-search"
            name="search"
            type="search"
            placeholder="Job title or company"
            value={filters.search}
            onChange={change}
          />
        </div>
        <div className="field">
          <label htmlFor="jfy-type">Type</label>
          <select id="jfy-type" name="type" value={filters.type} onChange={change}>
            <option value="">Job &amp; Internship</option>
            {JOB_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatJobType(type)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="jfy-field">Field</label>
          <select id="jfy-field" name="field" value={filters.field} onChange={change}>
            <option value="">All fields</option>
            {optionsFrom(jobs, 'field').map((field) => (
              <option key={field}>{field}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="jfy-location">Location</label>
          <select id="jfy-location" name="location" value={filters.location} onChange={change}>
            <option value="">All Bahrain</option>
            {optionsFrom(jobs, 'location').map((location) => (
              <option key={location}>{location}</option>
            ))}
          </select>
        </div>
      </section>

      <div className="jfy-section-head">
        <h2>Open jobs</h2>
        <span className="pill">Newest first</span>
        {!loading && !error && jobs.length > 0 && (
          <span className="jfy-count">
            Showing {shown.length} of {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="jfy-state" role="status">
          <span className="jfy-spinner" aria-hidden="true" />
          Loading jobs…
        </div>
      ) : error ? (
        <div className="jfy-state jfy-state--error" role="alert">
          <h3>Could not load jobs</h3>
          <p>{error}</p>
          <button type="button" className="btn btn--outline" onClick={() => setReloadKey(reloadKey + 1)}>
            Try again
          </button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="jfy-state">
          <h3>No open jobs right now</h3>
          <p>New jobs are added by companies all the time. Check back soon.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="jfy-state">
          <h3>No jobs match your search</h3>
          <p>Try a different word or fewer filters.</p>
          {filtering && (
            <button type="button" className="btn btn--outline" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="jfy-grid">
          {shown.map((job, index) => (
            <JobCard key={job.id} job={job} index={index} />
          ))}
        </div>
      )}
    </main>
  )
}
