import { useState } from 'react'
import { Link } from 'react-router-dom'
import { greeting } from '../../shared/utils/jobFormat.js'
import useOpenJobs from '../utils/useOpenJobs.js'
import JobFilters, { EMPTY_FILTERS, filterJobs } from '../components/JobFilters.jsx'
import JobResults from '../components/JobResults.jsx'
import JobCard from '../components/JobCard.jsx'

import '../styles/JobsForYou.css'

export default function JobsForYou() {
  const { firstName, jobs, loading, error, reload } = useOpenJobs()
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const shown = filterJobs(jobs, filters)

  return (
    <main className="container jfy">
      <header className="jfy-head">
        <h1 className="title">
          {greeting()}
          {firstName && `, ${firstName}`}
        </h1>
        <p className="muted">Here are the latest open jobs and internships.</p>
      </header>

      <JobFilters jobs={jobs} filters={filters} onChange={setFilters} />

      <div className="jfy-section-head">
        <h2>Open jobs</h2>
        <span className="pill">Newest first</span>
        {!loading && !error && jobs.length > 0 && (
          <span className="jfy-count">
            Showing {shown.length} of {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
          </span>
        )}
        <Link to="/jobseeker/jobs/all" className="btn btn--outline jfy-browse">
          Browse all jobs
        </Link>
      </div>

      <JobResults
        jobs={jobs}
        shown={shown}
        loading={loading}
        error={error}
        filters={filters}
        onRetry={reload}
        onClearFilters={() => setFilters(EMPTY_FILTERS)}
      >
        <div className="jfy-grid">
          {shown.map((job, index) => (
            <JobCard key={job.id} job={job} index={index} />
          ))}
        </div>
      </JobResults>
    </main>
  )
}
