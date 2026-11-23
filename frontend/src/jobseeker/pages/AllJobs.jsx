import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useOpenJobs from '../utils/useOpenJobs.js'
import JobFilters, { EMPTY_FILTERS, filterJobs } from '../components/JobFilters.jsx'
import JobResults from '../components/JobResults.jsx'
import { JobRow, JobMatchRowsLoading } from '../components/JobCard.jsx'
import '../styles/JobsForYou.css'

const PAGE_SIZE = 10

// All jobs (wireframe 6b): search + filters, then every open job in one card, 10 per page
export default function AllJobs() {
  const { jobs, loading, error, reload } = useOpenJobs()
  const [filters, setFiltersState] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const resultsRef = useRef(null)

  // a new search / filter starts again from page 1
  const setFilters = (next) => {
    setFiltersState(next)
    setPage(1)
  }

  const shown = filterJobs(jobs, filters)
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const pageJobs = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const goTo = (n) => {
    setPage(n)
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="container jfy">
      <header className="jfy-head">
        <Link to="/jobseeker/jobs" className="jfy-back">
          ← Back to your Top 10
        </Link>
        <h1 className="title">All jobs</h1>
        <p className="muted">Every open job and internship on Fursa, with your match score on each one.</p>
      </header>

      <JobFilters jobs={jobs} filters={filters} onChange={setFilters} />

      <section className="jfy-panel" aria-labelledby="jfy-results-title" ref={resultsRef}>
        <div className="jfy-panel__head">
          <div className="jfy-panel__title">
            <h2 id="jfy-results-title">
              {loading ? 'Loading jobs…' : `${shown.length} ${shown.length === 1 ? 'job' : 'jobs'} found`}
            </h2>
            <p>
              Sorted by match score · <span className="jfy-star">★</span> = in your Top 10
            </p>
          </div>
          <label className="jfy-switch">
            <button
              type="button"
              role="switch"
              aria-checked={filters.qualified}
              className="jfy-switch__track"
              onClick={() => setFilters({ ...filters, qualified: !filters.qualified })}
            >
              <span className="jfy-switch__knob" />
            </button>
            Only jobs I qualify for
          </label>
        </div>

        {loading ? (
          <JobMatchRowsLoading count={6} />
        ) : (
          <JobResults
            jobs={jobs}
            shown={shown}
            loading={false}
            error={error}
            filters={filters}
            onRetry={reload}
            onClearFilters={() => setFilters(EMPTY_FILTERS)}
          >
            <div className="jfy-match-list">
              {pageJobs.map((job, index) => (
                <JobRow key={job.id} job={job} index={index} />
              ))}
            </div>
          </JobResults>
        )}
      </section>

      {!loading && pages > 1 && (
        <nav className="jfy-pages" aria-label="Pages">
          {current > 1 && (
            <button type="button" className="jfy-pages__btn jfy-pages__btn--wide" onClick={() => goTo(current - 1)}>
              ← Prev
            </button>
          )}
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={n === current ? 'jfy-pages__btn jfy-pages__btn--on' : 'jfy-pages__btn'}
              aria-current={n === current ? 'page' : undefined}
              onClick={() => goTo(n)}
            >
              {n}
            </button>
          ))}
          {current < pages && (
            <button type="button" className="jfy-pages__btn jfy-pages__btn--wide" onClick={() => goTo(current + 1)}>
              Next →
            </button>
          )}
        </nav>
      )}
    </main>
  )
}
