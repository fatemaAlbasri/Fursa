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

  // The backend sends best match first. Home shows the Top 10 (best scored jobs the seeker qualifies for).
  // Before any job is scored (e.g. just signed up) there is no Top 10 yet → show the newest jobs instead.
  const hasScores = jobs.some((job) => job.match_score != null)
  const list = hasScores ? jobs.filter((job) => job.top) : jobs
  const shown = filterJobs(list, filters)

  return (
    <main className="container jfy">
      <header className="jfy-head">
        <h1 className="title">
          {greeting()}
          {firstName && `, ${firstName}`}
        </h1>
        <p className="muted">Here are the jobs that best match your skills.</p>
      </header>

      <JobFilters
        jobs={list}
        filters={filters}
        onChange={setFilters}
        action={
          <Link to="/jobseeker/jobs/all" className="btn btn--primary">
            Search all jobs
          </Link>
        }
      />

      <div className="jfy-section-head">
        <h2>{hasScores ? 'Top 10 matches' : 'Open jobs'}</h2>
        <span className="pill">{hasScores ? 'Sorted by match score' : 'Newest first'}</span>
        <Link to="/jobseeker/jobs/all" className="btn btn--outline jfy-browse">
          Browse all jobs
        </Link>
      </div>

      <JobResults
        jobs={list}
        shown={shown}
        loading={loading}
        error={error}
        filters={filters}
        onRetry={reload}
        onClearFilters={() => setFilters(EMPTY_FILTERS)}
        empty={
          hasScores && {
            title: 'No top matches yet',
            text: 'Add more skills to your profile, or browse all jobs.'
          }
        }
      >
        <div className="jfy-grid">
          {shown.map((job, index) => (
            <JobCard key={job.id} job={job} index={index} hideTop={hasScores} />
          ))}
        </div>
      </JobResults>
    </main>
  )
}
