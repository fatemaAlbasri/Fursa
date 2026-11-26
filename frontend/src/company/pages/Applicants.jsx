import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../../shared/api.js'
import { toApplicant, countStats } from '../data/applicants.js'
import StatusPill from '../../shared/components/StatusPill'
import { BriefcaseIcon, LockIcon, PeopleIcon, SparkleIcon } from '../../shared/components/icons.jsx'
import { formatDeadline, formatJobType } from '../../shared/utils/jobFormat.js'
import ScoreRing from '../components/ScoreRing.jsx'
import RejectDialog from '../components/RejectDialog.jsx'
import Notice from '../../shared/components/Notice.jsx'
import { tabOf } from '../data/jobs.js'
import '../styles/Applicants.css'

// Applicants dashboard 
// Left: the company's jobs (red badge = new applicants). Right: the picked job's applicants,
// ranked by AI match score, in tabs (Top 10 · Qualified · Not qualified · All) + a status filter.
// The employer ticks applicants, then shortlists or rejects them.

// Tabs 
const TABS = [
  { id: 'top', label: 'Top 10', show: (a) => a.qualified },
  { id: 'qualified', label: 'Qualified', count: (s) => s.qualified, show: (a) => a.qualified },
  { id: 'notQualified', label: 'Not qualified', count: (s) => s.notQualified, show: (a) => !a.qualified },
  { id: 'all', label: 'All', count: (s) => s.total, show: () => true }
]

//  Status filter (inside the tab) 
const STATUSES = [
  { id: 'all', label: 'All statuses' },
  { id: 'New', label: 'New', count: (s) => s.fresh },
  { id: 'Shortlisted', label: 'Shortlisted', count: (s) => s.shortlisted },
  { id: 'Interview', label: 'Interview', count: (s) => s.interview },
  { id: 'Accepted', label: 'Accepted', count: (s) => s.accepted },
  { id: 'Rejected', label: 'Rejected', count: (s) => s.rejected }
]

const jobSub = (j) =>
  [formatJobType(j.job_type), tabOf(j) === 'closed' && 'Closed', j.applicants === 0 && 'no applicants yet']
    .filter(Boolean)
    .join(' · ')

const line = (width, thin) => <span className={thin ? 'sk sk--line sk--thin' : 'sk sk--line'} style={{ width }} />

function ApplicantsLoading() {
  return (
    <div className="ap-loading" role="status" aria-label="Loading applicants">
      <div className="ap-stats" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="ap-stat">
            {line(36)}
            {line('60%', true)}
          </div>
        ))}
      </div>
      <div className="ap-tabbar" aria-hidden="true">
        <div className="ap-tabs">
          {[70, 90, 110, 50].map((w) => (
            <span key={w} className="sk sk--line ap-sk-tab" style={{ width: w }} />
          ))}
        </div>
      </div>
      <section className="ap-list" aria-hidden="true">
        <div className="ap-toolbar">
          {line(170)}
          <span className="sk sk--btn" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="ap-row ap-row--loading">
            <span className="sk ap-sk-avatar" />
            <div className="ap-who ap-loading__text">
              {line('40%')}
              {line('60%', true)}
            </div>
            <span className="sk ap-sk-ring" />
            <span className="sk sk--pill" />
          </div>
        ))}
      </section>
    </div>
  )
}

function JobsListLoading() {
  return (
    <aside className="ap-jobs" aria-hidden="true">
      <p className="ap-jobs__title">YOUR JOBS</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="ap-jobitem ap-loading__text">
          {line('80%')}
          {line('50%', true)}
        </div>
      ))}
    </aside>
  )
}

export default function Applicants() {
  const { state } = useLocation() // { jobId } when coming back from one applicant's page

  const [jobs, setJobs] = useState(null) // the company's jobs (left list); null = loading
  const [jobId, setJobId] = useState(null) // the picked job
  const [applicants, setApplicants] = useState(null) // null = loading
  const [tab, setTab] = useState('top')
  const [status, setStatus] = useState('all') // status filter inside the tab
  const [sort, setSort] = useState('score') // 'score' | 'date'
  const [selected, setSelected] = useState([]) // ids of the ticked applicants
  const [error, setError] = useState('')
  const [features, setFeatures] = useState(null) // what the company's plan allows
  const [rejecting, setRejecting] = useState(false) // "Reject N applicants?" pop-up is open
  const [notice, setNotice] = useState(null) // "2 applicants rejected and notified."

  const list = applicants || []
  const stats = { ...countStats(list), fresh: list.filter((a) => a.status === 'New').length }

  // drafts can't have applicants, so they aren't in the list
  const shownJobs = (jobs || []).filter((j) => tabOf(j) !== 'draft')
  const job = shownJobs.find((j) => j.id === jobId)
  // back link opens the tab the picked job is in
  const jobTab = job ? tabOf(job) : 'active'
  const backTo = jobTab === 'active' ? '/company/jobs' : `/company/jobs?tab=${jobTab}`

  // 1) the company's jobs → open the job we came back from, else the first one that has applicants
  useEffect(() => {
    api('/jobs/mine')
      .then(({ jobs }) => {
        setJobs(jobs)
        const open = jobs.filter((j) => tabOf(j) !== 'draft')
        const first = open.find((j) => j.id === state?.jobId) || open.find((j) => j.applicants > 0) || open[0]
        if (first) setJobId(first.id)
      })
      .catch((err) => {
        setJobs([])
        setError(err.error || 'Could not load your jobs.')
      })
  }, [])

  // 2) the applicants of the picked job
  useEffect(() => {
    if (!jobId) return
    let ignore = false // a late answer for a job that is no longer picked is dropped
    setApplicants(null)
    api(`/jobs/mine/${jobId}/applicants`)
      .then((data) => {
        if (ignore) return
        setApplicants(data.applicants.map(toApplicant))
        setFeatures(data.features)
      })
      .catch((err) => {
        if (ignore) return
        setApplicants([])
        setError(err.error || 'Could not load the applicants.')
      })
    return () => {
      ignore = true
    }
  }, [jobId])

  //  Plan limits 
  // Free plan
  const ranked = Boolean(features?.ai_ranking)
  const reasons = Boolean(features?.match_reasons)
  const bulk = Boolean(features?.bulk_actions)
  const onFree = features && !ranked

  //  The list for the open tab 
  const tabs = TABS.filter((t) => ranked || t.id !== 'top') // Top 10 needs AI ranking
  const currentTab = tabs.find((t) => t.id === tab) || tabs.find((t) => t.id === 'all')
  const sortBy = ranked ? sort : 'date' // no scores, so sort by date
  let rows = list.filter(currentTab.show).filter((a) => status === 'all' || a.status === status)
  rows = [...rows].sort((a, b) =>
    sortBy === 'score' ? (b.score ?? -1) - (a.score ?? -1) : b.appliedOn.localeCompare(a.appliedOn) // newest first
  )
  if (currentTab.id === 'top') rows = rows.slice(0, 10)

  //  Ticking applicants 
  const allChecked = rows.length > 0 && rows.every((a) => selected.includes(a.id))
  const toggleOne = (id) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  const toggleAll = () => setSelected(allChecked ? [] : rows.map((a) => a.id))

  //  Job / tab / filter changes 
  const pickJob = (id) => {
    if (id === jobId) return
    setJobId(id)
    setSelected([])
    setStatus('all')
  }
  const changeTab = (id) => {
    setTab(id)
    setSelected([])
  }
  const changeStatus = (e) => {
    setStatus(e.target.value)
    setSelected([])
  }

  const shortlistSelected = async () => {
    if (selected.length === 0) return
    try {
      const data = await api(`/jobs/mine/${jobId}/applicants`, {
        method: 'PATCH',
        body: { ids: selected, status: 'shortlisted' }
      })
      setApplicants(list.map((a) => (data.updated.includes(a.id) ? { ...a, status: 'Shortlisted' } : a)))
      setSelected([])
    } catch (err) {
      setError(err.error || 'Could not shortlist. Try again.')
    }
  }
  const rejectSelected = () => {
    if (selected.length === 0) return
    setNotice(null)
    setRejecting(true)
  }
  const rejected = ({ updated, skipped }) => {
    setApplicants(list.map((a) => (updated.includes(a.id) ? { ...a, status: 'Rejected' } : a)))
    setSelected([])
    setRejecting(false)
    const n = updated.length
    setNotice({
      type: 'success',
      text:
        `${n} ${n === 1 ? 'applicant' : 'applicants'} rejected and notified.` +
        (skipped.length ? ` ${skipped.length} skipped (already accepted or rejected).` : '')
    })
  }

  const head = (
    <div className="ap-head">
      <Link to={backTo} className="ap-back">
        ← All jobs
      </Link>
      <h1>Applicants</h1>
      <p className="ap-sub">{onFree ? 'Sorted by date applied' : 'Ranked by AI'} · you make every decision</p>
    </div>
  )

  //  Loading the jobs 
  if (jobs === null) {
    return (
      <main className="container container--wide ap">
        {head}
        <div className="ap-layout">
          <JobsListLoading />
          <div className="ap-main">
            <ApplicantsLoading />
          </div>
        </div>
      </main>
    )
  }

  //  No jobs yet 
  if (shownJobs.length === 0) {
    return (
      <main className="container container--wide ap">
        {head}
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        <section className="ap-blank">
          <span className="ap-blank__icon" aria-hidden="true">
            <BriefcaseIcon />
          </span>
          <h2>You haven't posted a job yet</h2>
          <p>Post your first job and applicants will appear here, ranked by AI with a reason for every score.</p>
          <Link to="/company/post-job" className="ap-btn ap-btn--teal ap-blank__btn">
            Post a job
          </Link>
        </section>
      </main>
    )
  }

  let content
  if (applicants === null) {
    content = <ApplicantsLoading />
  } else if (list.length === 0 && job) {
    //  This job has no applicants yet 
    content = (
      <section className="ap-blank">
        <span className="ap-blank__icon" aria-hidden="true">
          <PeopleIcon />
        </span>
        <h2>No applicants yet</h2>
        <p>
          {tabOf(job) === 'closed'
            ? `${job.title} is closed. Nobody applied before it closed.`
            : `${job.title} is live until ${formatDeadline(job.deadline)}. We'll notify you as soon as someone applies.`}
        </p>
        <Link to={`/company/jobs/${job.id}`} className="ap-btn ap-btn--outline ap-blank__btn">
          View job post
        </Link>
      </section>
    )
  } else {
    content = (
      <>
        {onFree && (
          <div className="ap-upgrade" role="note">
            <span className="ap-upgrade__icon" aria-hidden="true">
              <SparkleIcon />
            </span>
            <p>
              <b>You're on the Free plan.</b> Applicants are sorted by date. Upgrade to see AI match scores, your Top
              10 and the reason behind every score.
            </p>
            <Link to="/company/plans" className="ap-upgrade__link">
              See plans →
            </Link>
          </div>
        )}

        {/* Stat boxes */}
        <div className="ap-stats">
          <div className="ap-stat ap-stat--total">
            <b>{stats.total}</b>
            <span>Total applicants</span>
          </div>
          <div className="ap-stat ap-stat--good">
            <b>{stats.qualified}</b>
            <span>Qualified</span>
          </div>
          <div className="ap-stat ap-stat--bad">
            <b>{stats.notQualified}</b>
            <span>Not qualified</span>
          </div>
          <div className="ap-stat ap-stat--short">
            <b>{stats.shortlisted}</b>
            <span>Shortlisted</span>
          </div>
        </div>

        {/* Tabs (underlined) , status filter  */}
        <div className="ap-tabbar">
          <div className="ap-tabs" role="tablist" aria-label="Applicant groups">
            {tabs.map((t) => {
              const on = currentTab.id === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={on ? 'ap-tab ap-tab--on' : 'ap-tab'}
                  onClick={() => changeTab(t.id)}
                >
                  {t.label}
                  {t.count && <span className="ap-tab__count">{t.count(stats)}</span>}
                </button>
              )
            })}
          </div>
          <div className="ap-status">
            <label htmlFor="ap-status">Status</label>
            <select id="ap-status" value={status} onChange={changeStatus}>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.count ? `${s.label} (${s.count(stats)})` : s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ---------- Applicant list ---------- */}
        <section className="ap-list">
          {/* toolbar: select all · shortlist · reject · sort */}
          <div className="ap-toolbar">
            {bulk ? (
              <>
                <label className="ap-selectall">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                  Select all <span>({selected.length} selected)</span>
                </label>
                <div className="ap-toolbar__right">
                  <button type="button" className="ap-btn ap-btn--teal" onClick={shortlistSelected}>
                    Shortlist selected
                  </button>
                  <button type="button" className="ap-btn ap-btn--reject" onClick={rejectSelected}>
                    Reject selected
                  </button>
                  {ranked && (
                    <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
                      <option value="score">Sort: match score</option>
                      <option value="date">Sort: date applied</option>
                    </select>
                  )}
                </div>
              </>
            ) : (
              <p className="ap-locked">
                <LockIcon />
                Bulk shortlist / reject is on the Starter plan. Open an applicant to decide one by one.
              </p>
            )}
          </div>

          {/* one row per applicant (scrolls sideways on small screens) */}
          <div className="ap-rows">
            {rows.map((a, i) => (
              <div key={a.id} className="ap-row">
                {bulk && (
                  <input
                    type="checkbox"
                    aria-label={`Select ${a.name}`}
                    checked={selected.includes(a.id)}
                    onChange={() => toggleOne(a.id)}
                  />
                )}
                {ranked && <span className="ap-rank">#{i + 1}</span>}
                <span className="ap-avatar" style={{ background: a.color }}>
                  {a.initials}
                </span>
                <div className="ap-who">
                  <b>{a.name}</b>
                  <span>{reasons ? a.why : `Applied ${formatDeadline(a.appliedOn)}`}</span>
                </div>
                {ranked && <ScoreRing score={a.score} />}
                <StatusPill status={a.status} />
                <Link to={`/company/jobs/${jobId}/applicants/${a.id}`} className="ap-view">
                  View applicant
                </Link>
              </div>
            ))}
            {rows.length === 0 && <p className="ap-empty">No applicants here.</p>}
          </div>

          {/* footer link → opens the Qualified tab */}
          {currentTab.id === 'top' && status === 'all' && stats.qualified > rows.length && (
            <div className="ap-foot">
              <button type="button" onClick={() => changeTab('qualified')}>
                Show all {stats.qualified} qualified applicants →
              </button>
            </div>
          )}
        </section>
      </>
    )
  }

  return (
    <main className="container container--wide ap">
      {head}

      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <RejectDialog
        open={rejecting}
        jobId={jobId}
        ids={selected}
        sub={job && `${job.title} · ${currentTab.label} tab`}
        allNotQualified={list.filter((a) => selected.includes(a.id)).every((a) => !a.qualified)}
        onClose={() => setRejecting(false)}
        onDone={rejected}
      />

      <div className="ap-layout">
        {/* ---------- Left: the company's jobs ---------- */}
        <aside className="ap-jobs" aria-label="Your jobs">
          <p className="ap-jobs__title">YOUR JOBS</p>
          {shownJobs.map((j) => {
            const on = j.id === jobId
            return (
              <button
                key={j.id}
                type="button"
                aria-current={on ? 'true' : undefined}
                className={on ? 'ap-jobitem ap-jobitem--on' : 'ap-jobitem'}
                onClick={() => pickJob(j.id)}
              >
                <span className="ap-jobitem__text">
                  <span className="ap-jobitem__title">{j.title}</span>
                  <span className="ap-jobitem__sub">{jobSub(j)}</span>
                </span>
                {j.newCount > 0 && (
                  <span className="ap-jobitem__badge" aria-label={`${j.newCount} new`}>
                    {j.newCount}
                  </span>
                )}
              </button>
            )
          })}
          <Link to="/company/post-job" className="ap-jobs__post">
            + Post a job
          </Link>
        </aside>

        <div className="ap-main">
          {/* phones: the job list becomes a drop-down */}
          <div className="ap-jobpick">
            <label htmlFor="ap-jobpick">Job</label>
            <select id="ap-jobpick" value={jobId ?? ''} onChange={(e) => pickJob(Number(e.target.value))}>
              {shownJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} · {j.applicants} applicants
                </option>
              ))}
            </select>
          </div>
          {content}
        </div>
      </div>
    </main>
  )
}
