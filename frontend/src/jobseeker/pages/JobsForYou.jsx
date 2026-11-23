import { Link } from 'react-router-dom'
import { greeting } from '../../shared/utils/jobFormat.js'
import { SearchIcon, StarIcon } from '../../shared/components/icons.jsx'
import useOpenJobs from '../utils/useOpenJobs.js'
import { EMPTY_FILTERS } from '../components/JobFilters.jsx'
import JobResults from '../components/JobResults.jsx'
import { JobMatchRow, JobMatchRowsLoading } from '../components/JobCard.jsx'
import HomeSidebar from '../components/HomeSidebar.jsx'

import '../styles/JobsForYou.css'

// Job seeker home (wireframe 6): Top 10 matches on the left, preferences + CV strength on the right.
// Searching and filtering live on All jobs.
export default function JobsForYou() {
  const { firstName, jobs, loading, error, reload } = useOpenJobs()

  // The backend sends best match first. Top 10 = best scored jobs the seeker qualifies for.
  // Before any job is scored (e.g. just signed up) there is no Top 10 yet → show the newest jobs instead.
  const hasScores = jobs.some((job) => job.match_score != null)
  const list = hasScores ? jobs.filter((job) => job.top) : jobs
  const showTop = loading || hasScores // while loading, keep the Top 10 heading (no flash of "Open jobs")

  return (
    <main className="container jfy">
      <header className="jfy-head jfy-head--home">
        <div>
          <h1 className="title">
            {greeting()}
            {firstName && `, ${firstName}`}
          </h1>
          <p className="muted">Here are the jobs that best match your skills.</p>
        </div>
        <Link to="/jobseeker/jobs/all" className="btn btn--primary jfy-head__browse">
          <SearchIcon />
          Browse all jobs
        </Link>
      </header>

      <div className="jfy-home">
        {/* one white card: header, then the jobs as rows split by thin lines */}
        <section className="jfy-home__main jfy-panel" aria-labelledby="jfy-top-title">
          <div className="jfy-panel__head">
            <span className="jfy-side__icon">
              <StarIcon />
            </span>
            <div>
              <h2 id="jfy-top-title">{showTop ? 'Top 10 matches' : 'Open jobs'}</h2>
              <p>
                {showTop
                  ? 'Sorted by match score · based on your skills and preferences'
                  : 'Newest first · add skills to your profile to see your matches'}
              </p>
            </div>
          </div>

          {loading ? (
            <JobMatchRowsLoading />
          ) : (
            <JobResults
              jobs={list}
              shown={list}
              loading={false}
              error={error}
              filters={EMPTY_FILTERS}
              onRetry={reload}
              empty={
                hasScores && {
                  title: 'No top matches yet',
                  text: 'Add more skills to your profile, or browse all jobs.'
                }
              }
            >
              <div className="jfy-match-list">
                {list.map((job, index) => (
                  <JobMatchRow key={job.id} job={job} index={index} />
                ))}
              </div>
            </JobResults>
          )}
        </section>

        <HomeSidebar />
      </div>
    </main>
  )
}
