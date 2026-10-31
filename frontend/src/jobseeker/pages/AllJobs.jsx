import { useState } from 'react'
import { Link } from 'react-router-dom'
import useOpenJobs from '../utils/useOpenJobs.js'
import JobFilters, { EMPTY_FILTERS, filterJobs } from '../components/JobFilters.jsx'
import JobResults from '../components/JobResults.jsx'
import JobCard, { JobRow } from '../components/JobCard.jsx'
import { GridIcon, ListIcon } from '../../shared/components/icons.jsx'
import '../styles/JobsForYou.css'

// The two ways to show the jobs: same jobs, only the layout changes
const VIEWS = [
  { id: 'list', label: 'List view', Icon: ListIcon },
  { id: 'grid', label: 'Grid view', Icon: GridIcon }
]

export default function AllJobs() {
  const { jobs, loading, error, reload } = useOpenJobs()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [view, setView] = useState('list') // list = like the wireframe

  const shown = filterJobs(jobs, filters)

  return (
    <main className="container jfy">
      <header className="jfy-head">
        <Link to="/jobseeker/jobs" className="jfy-back">
          ← Back to Jobs for you
        </Link>
        <h1 className="title">All jobs</h1>
        <p className="muted">Every open job and internship on Fursa.</p>
      </header>

      <JobFilters jobs={jobs} filters={filters} onChange={setFilters} />

      <div className="jfy-section-head">
        {!loading && !error && jobs.length > 0 && (
          <span className="jfy-found">
            {shown.length} {shown.length === 1 ? 'job' : 'jobs'} found
          </span>
        )}
        <div className="jfy-views" role="group" aria-label="Layout">
          {VIEWS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={view === id ? 'jfy-views__btn jfy-views__btn--active' : 'jfy-views__btn'}
              aria-pressed={view === id}
              aria-label={label}
              title={label}
              onClick={() => setView(id)}
            >
              <Icon />
            </button>
          ))}
        </div>
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
        {view === 'grid' ? (
          <div className="jfy-grid">
            {shown.map((job, index) => (
              <JobCard key={job.id} job={job} index={index} />
            ))}
          </div>
        ) : (
          <div className="jfy-list">
            {shown.map((job, index) => (
              <JobRow key={job.id} job={job} index={index} />
            ))}
          </div>
        )}
      </JobResults>
    </main>
  )
}
