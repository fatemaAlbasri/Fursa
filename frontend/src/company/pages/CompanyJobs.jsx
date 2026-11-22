import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../shared/api.js'
import Loading from '../../shared/components/Loading.jsx'
import ConfirmDialog from '../../shared/components/ConfirmDialog.jsx'
import { tabOf } from '../data/jobs.js'
import {
  formatJobType,
  formatDeadline,
  daysLeft
} from '../../shared/utils/jobFormat.js'
import '../styles/CompanyJobs.css'

const TABS = [
  { id: 'active', label: 'Active' },
  { id: 'draft', label: 'Drafts' },
  { id: 'closed', label: 'Closed' }
]

export default function CompanyJobs() {
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(null) // job to close (opens the dialog)
  const [deleting, setDeleting] = useState(null) // draft to delete (opens the dialog)
  // keep the tab in the url so back and refresh remember it
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'active'
  const setTab = (id) =>
    setSearchParams(id === 'active' ? {} : { tab: id }, { replace: true })

  const load = () =>
    api('/jobs/mine')
      .then(({ jobs }) => setJobs(jobs))
      .catch((err) => setError(err.error || 'Could not load your jobs.'))

  useEffect(() => {
    load()
  }, [])

  const closeJob = async (job) => {
    setClosing(null)
    try {
      await api(`/jobs/mine/${job.id}/close`, { method: 'PATCH' })
      load()
    } catch (err) {
      setError(err.error || 'Could not close the job.')
    }
  }

  const deleteDraft = async (job) => {
    setDeleting(null)
    try {
      await api(`/jobs/mine/${job.id}`, { method: 'DELETE' })
      load()
    } catch (err) {
      setError(err.error || 'Could not delete the draft.')
    }
  }

  if (error && !jobs)
    return (
      <main className="container">
        <p className="field__error" role="alert">
          {error}
        </p>
      </main>
    )
  if (!jobs) return <Loading text="Loading your jobs…" />

  const active = jobs.filter((j) => tabOf(j) === 'active')
  const stats = {
    active: active.length,
    applicants: jobs.reduce((n, j) => n + j.applicants, 0),
    newThisWeek: jobs.reduce((n, j) => n + j.newThisWeek, 0),
    closingSoon: active.filter((j) => daysLeft(j.deadline) <= 7).length
  }
  const shown = jobs.filter((j) => tabOf(j) === tab)
  const companyName = jobs[0]?.company_name || 'your company'

  return (
    <main className="cj">
      <header className="cj-head">
        <div>
          <h1 className="cj-title">Your jobs</h1>
          <p className="cj-sub">
            Manage all of {companyName}'s jobs and internships.
          </p>
        </div>
        <Link to="/company/post-job" className="cj-post">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Post a new job
        </Link>
      </header>

      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      <div className="cj-stats">
        <div className="cj-stat cj-stat--main">
          <b>{stats.active}</b>
          <span>Active jobs</span>
        </div>
        <div className="cj-stat">
          <b>{stats.applicants}</b>
          <span>Total applicants</span>
        </div>
        <div className="cj-stat cj-stat--teal">
          <b>{stats.newThisWeek}</b>
          <span>New this week</span>
        </div>
        <div className="cj-stat cj-stat--warn">
          <b>{stats.closingSoon}</b>
          <span>Closing in 7 days</span>
        </div>
      </div>

      <div className="cj-tabs" role="tablist" aria-label="Job status">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'cj-tab cj-tab--on' : 'cj-tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label} ({jobs.filter((j) => tabOf(j) === t.id).length})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="cj-empty" key={tab}>
          {tab === 'active' ? (
            <>
              <p>You have no active jobs.</p>
              <Link to="/company/post-job" className="cj-btn cj-btn--primary">
                Post a job
              </Link>
            </>
          ) : (
            <p>Nothing here yet.</p>
          )}
        </div>
      ) : (
        <div className="cj-list" key={tab}>
          {shown.map((job, index) => (
            <article key={job.id} className="cj-card" style={{ '--i': index }}>
              <div className="cj-card__main">
                <div className="cj-card__top">
                  <h2 className="cj-card__title">
                    <Link to={`/company/jobs/${job.id}`}>{job.title}</Link>
                  </h2>
                  {job.job_type && (
                    <span className={`cj-type cj-type--${job.job_type}`}>
                      {formatJobType(job.job_type)}
                    </span>
                  )}
                </div>
                <p className="cj-card__meta">
                  {tab === 'draft' ? 'Created' : 'Posted'}{' '}
                  {formatDeadline(job.created_at)}
                </p>
              </div>

              {tab !== 'draft' && (
                <div className="cj-nums">
                  <div className="cj-num">
                    <b>{job.applicants}</b>
                    <span>Applicants</span>
                  </div>
                  <div className="cj-num cj-num--good">
                    <b>{job.qualified}</b>
                    <span>Qualified</span>
                  </div>
                  <div className="cj-num cj-num--teal">
                    <b>{job.newCount}</b>
                    <span>{tab === 'closed' ? 'Waiting' : 'New'}</span>
                  </div>
                </div>
              )}

              <div className="cj-actions">
                {tab === 'draft' ? (
                  <>
                    <Link
                      to={`/company/jobs/${job.id}/edit`}
                      className="cj-btn cj-btn--primary"
                    >
                      Continue editing
                    </Link>
                    <div className="cj-actions__row">
                      <button
                        type="button"
                        className="cj-btn cj-btn--ghost cj-btn--danger"
                        onClick={() => setDeleting(job)}
                      >
                        Delete draft
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      to="/company/applicants"
                      state={{ jobId: job.id }}
                      className="cj-btn cj-btn--primary"
                    >
                      View applicants
                    </Link>
                    <div className="cj-actions__row">
                      <Link
                        to={`/company/jobs/${job.id}`}
                        className="cj-btn cj-btn--ghost"
                      >
                        {tab === 'closed' ? 'View job' : 'View & edit'}
                      </Link>
                      {tab === 'active' && (
                        <button
                          type="button"
                          className="cj-btn cj-btn--ghost cj-btn--danger"
                          onClick={() => setClosing(job)}
                        >
                          Close job
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!closing}
        title="Close this job?"
        message="Job seekers will no longer see it or be able to apply."
        confirmLabel="Close job"
        danger
        onConfirm={() => closeJob(closing)}
        onCancel={() => setClosing(null)}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete this draft?"
        message="This cannot be undone."
        confirmLabel="Delete draft"
        danger
        onConfirm={() => deleteDraft(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </main>
  )
}
