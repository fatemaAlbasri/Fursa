import { EMPTY_FILTERS } from './JobFilters.jsx'

// Loading / error / "no jobs" / "no match" messages shared by Jobs for you and All jobs.
// When there are jobs to show, it shows `children` (the cards or rows) instead.
// empty = { title, text } to say something else when `jobs` is empty
export default function JobResults({ jobs, shown, loading, error, filters, onRetry, onClearFilters, empty, children }) {
  const filtering = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  if (loading) {
    return (
      <div className="jfy-state" role="status">
        <span className="jfy-spinner" aria-hidden="true" />
        Loading jobs…
      </div>
    )
  }
  if (error) {
    return (
      <div className="jfy-state jfy-state--error" role="alert">
        <h3>Could not load jobs</h3>
        <p>{error}</p>
        <button type="button" className="btn btn--outline" onClick={onRetry}>
          Try again
        </button>
      </div>
    )
  }
  if (jobs.length === 0) {
    return (
      <div className="jfy-state">
        <h3>{empty?.title || 'No open jobs right now'}</h3>
        <p>{empty?.text || 'New jobs are added by companies all the time. Check back soon.'}</p>
      </div>
    )
  }
  if (shown.length === 0) {
    return (
      <div className="jfy-state">
        <h3>No jobs match your search</h3>
        <p>Try a different word or fewer filters.</p>
        {filtering && (
          <button type="button" className="btn btn--outline" onClick={onClearFilters}>
            Clear filters
          </button>
        )}
      </div>
    )
  }
  return children
}
