import { useEffect, useState } from 'react'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams
} from 'react-router-dom'
import JobForm from '../components/JobForm.jsx'
import HiringSummary from '../components/HiringSummary.jsx'
import { api } from '../../shared/api.js'
import {
  formatJobType,
  formatWorkMode,
  formatDeadline,
  daysLeft,
  splitLines,
  formatExperience,
  formatSalary
} from '../../shared/utils/jobFormat.js'
import { toJobBody, jobToForm, tabOf } from '../data/jobs.js'
import Notice from '../../shared/components/Notice.jsx'
import ConfirmDialog from '../../shared/components/ConfirmDialog.jsx'
import {
  BriefcaseIcon,
  LockIcon,
  PencilIcon,
  InfoIcon,
  EyeIcon
} from '../../shared/components/icons.jsx'
import '../styles/JobView.css'

const LIVE_TEXT = 'Your job is live. Job seekers who match can now see and apply.'

// A small grey box: label on top, value under it
function Info({ label, children }) {
  return (
    <div className="jv-info">
      <span className="jv-info__label">{label}</span>
      <span className="jv-info__value">{children}</span>
    </div>
  )
}

// one row in job details
function Row({ label, children }) {
  return (
    <div className="jv-row">
      <span className="jv-row__label">{label}</span>
      <span className="jv-row__value">{children}</span>
    </div>
  )
}

function JobViewLoading() {
  const line = (width, thin) => <span className={thin ? 'sk sk--line sk--thin' : 'sk sk--line'} style={{ width }} />
  return (
    <main className="jv jv-loading" role="status" aria-label="Loading job">
      {line(140, true)}
      <section className="jv-card jv-hero" aria-hidden="true">
        <div className="jv-hero__top">
          <span className="sk jv-hero__logo" />
          <div className="jv-hero__text jv-loading__text">
            <div className="jv-tags">
              <span className="sk sk--pill" />
              <span className="sk sk--pill" />
            </div>
            {line('55%')}
            {line('40%', true)}
          </div>
          <div className="jv-hero__actions">
            <span className="sk sk--btn" />
            <span className="sk sk--btn" />
          </div>
        </div>
        <div className="jv-stats">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="jv-stat jv-loading__text">
              {line(30)}
              {line('50%', true)}
            </div>
          ))}
        </div>
      </section>
      <div className="jv-cols" aria-hidden="true">
        <section className="jv-card jv-main jv-loading__text">
          {[0, 1, 2].map((i) => (
            <div key={i} className="jv-loading__text jv-loading__block">
              {line(160)}
              {line('95%', true)}
              {line('75%', true)}
            </div>
          ))}
        </section>
        <aside className="jv-side">
          <section className="jv-card jv-loading__text">
            {line(150)}
            {line('70%', true)}
            <span className="sk jv-sk-btn" />
            <span className="sk jv-sk-btn" />
          </section>
          <section className="jv-card jv-loading__text">
            {line(110)}
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="jv-loading__row">
                {line(70, true)}
                {line(80, true)}
              </div>
            ))}
          </section>
        </aside>
      </div>
    </main>
  )
}

export default function JobView({ editing = false }) {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  // just posted from Post a job
  const [notice, setNotice] = useState(
    location.state?.justPosted ? { type: 'success', text: LIVE_TEXT } : null
  )
  const [confirmClose, setConfirmClose] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api('/jobs/mine/' + id)
      .then((data) => setJob(data.job))
      .catch(() => setJob(false))
  }, [id])

  if (job === null) return <JobViewLoading />

  if (job === false) {
    return (
      <div className="jv-overlay">
        <div
          className="jv-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="jv-popup-title"
        >
          <span className="jv-popup__icon">
            <InfoIcon />
          </span>
          <h2 id="jv-popup-title">Job not found</h2>
          <p>This job doesn't exist, or it isn't one of your jobs.</p>
          <Link to="/company/jobs" className="btn btn--primary">
            Back to your jobs
          </Link>
        </div>
      </div>
    )
  }

  // drafts open in edit mode
  if (job.status === 'draft' && !editing) {
    return <Navigate to={`/company/jobs/${id}/edit`} replace />
  }

  const roles = splitLines(job.responsibilities)
  const isClosed = job.status === 'closed'
  const isDraft = job.status === 'draft'
  const left = Math.max(0, daysLeft(job.deadline))

  const showError = (err) =>
    setNotice({ type: 'error', text: err.error || 'Something went wrong. Please try again.' })

  // 'draft' = save draft, 'open' = publish or save
  const saveChanges = (form, status) => {
    if (saving) return
    setSaving(true)
    api('/jobs/mine/' + id, { method: 'PUT', body: toJobBody(form, status) })
      .then((data) => {
        setJob(data.job)
        const text =
          status === 'draft' ? 'Draft saved. Publish it when you are ready.'
          : isDraft ? LIVE_TEXT
          : 'Changes saved. Applicants have been re-ranked.'
        setNotice({ type: 'success', text })
        // a saved draft stays in the form, everything else goes back to the job
        if (status !== 'draft') navigate(`/company/jobs/${id}`, { replace: true })
      })
      .catch(showError)
      .finally(() => {
        setSaving(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
  }

  const closeJob = () => {
    if (saving) return
    setSaving(true)
    api('/jobs/mine/' + id + '/close', { method: 'PATCH' })
      .then((data) => {
        setJob(data.job)
        setNotice({ type: 'success', text: 'Job closed. Job seekers can no longer apply.' })
      })
      .catch(showError)
      .finally(() => {
        setSaving(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
  }

  // back link opens the same tab this job is in
  const tab = tabOf(job)
  const backTo = tab === 'active' ? '/company/jobs' : `/company/jobs?tab=${tab}`

  return (
    <main className="jv">
      <Link to={backTo} className="jv-back">
        ← Back to your jobs
      </Link>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      {/* Edit note */}
      {editing && (
        <p className="jv-warn" role="note">
          <InfoIcon />
          {isDraft
            ? "You are editing a draft. Job seekers can't see it until you publish it."
            : 'You are editing a live job. If you change the requirements, Fursa will re-rank all applicants.'}
        </p>
      )}

      {/* Header */}
      <section className="jv-card jv-hero">
        <div className="jv-hero__top">
          <span className="jv-hero__logo" aria-hidden="true">
            <BriefcaseIcon />
          </span>

          <div className="jv-hero__text">
            <div className="jv-tags">
              <span className={`jv-tag jv-tag--${job.status}`}>
                ● {isDraft ? 'Draft' : isClosed ? 'Closed' : 'Active'}
              </span>
              {job.job_type && (
                <span className="jv-tag">{formatJobType(job.job_type)}</span>
              )}
              {job.work_mode && (
                <span className="jv-tag">{formatWorkMode(job.work_mode)}</span>
              )}
            </div>
            <h1>{job.title}</h1>
            <p>
              {isDraft ? 'Created' : 'Posted'} {formatDeadline(job.created_at)}
              {job.deadline && ` · Deadline ${formatDeadline(job.deadline)}`}
            </p>
          </div>

          {!editing && (
            <div className="jv-hero__actions">
              <button
                type="button"
                className="jv-btn jv-btn--outline"
                onClick={() => navigate(`/company/jobs/${id}/edit`)}
                disabled={isClosed}
              >
                <PencilIcon />
                Edit job
              </button>
              {!isDraft && (
                <Link
                  to="/company/applicants"
                  state={{ jobId: job.id }}
                  className="jv-btn jv-btn--primary"
                >
                  View applicants
                </Link>
              )}
            </div>
          )}
        </div>

        {/* no stats for drafts */}
        {!isDraft && (
          <div className="jv-stats">
            <div className="jv-stat">
              <b>{job.stats.applicants}</b>
              <span>Applicants</span>
            </div>
            <div className="jv-stat jv-stat--good">
              <b>{job.stats.qualified}</b>
              <span>Qualified</span>
            </div>
            <div className="jv-stat jv-stat--teal">
              <b>{job.stats.newCount}</b>
              <span>New</span>
            </div>
            <div className="jv-stat jv-stat--warn">
              <b>{left}</b>
              <span>Days left</span>
            </div>
          </div>
        )}
      </section>

      {editing ? (
        <JobForm
          initial={jobToForm(job)}
          stacked
          edit
          saving={saving}
          submitLabel={isDraft ? 'Publish job' : 'Save changes'}
          onSubmit={(form) => saveChanges(form, 'open')}
          secondary={
            isDraft
              ? {
                  label: 'Save draft',
                  checkTitleOnly: true,
                  onClick: (form) => saveChanges(form, 'draft')
                }
              : {
                  label: 'Cancel',
                  onClick: () => navigate(`/company/jobs/${id}`)
                }
          }
        />
      ) : (
        <>
          <div className="jv-cols">
            <section className="jv-card jv-main">
              <div className="jv-section">
                <h2>Job description</h2>
                <p className="jv-text">{job.description || '—'}</p>
              </div>

              <div className="jv-section">
                <h2>Role &amp; responsibilities</h2>
                {roles.length ? (
                  <ul className="jv-list">
                    {roles.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="jv-text">—</p>
                )}
              </div>

              <div className="jv-section">
                <h2>Requirements</h2>
                <p className="jv-hint">
                  Applicants missing a <b>must-have</b> go to the Not qualified
                  tab.
                </p>
                <div className="jv-skills">
                  {job.skills.map((s) => (
                    <span
                      key={s.name}
                      className={
                        s.is_required ? 'jv-skill jv-skill--must' : 'jv-skill'
                      }
                    >
                      {s.name}
                      {s.is_required && <em>MUST</em>}
                    </span>
                  ))}
                </div>
                <div className="jv-req-grid">
                  <Info label="Major">
                    {job.field || 'Any major'}
                    {job.field && job.major_must_have && (
                      <em className="jv-must">MUST</em>
                    )}
                  </Info>
                  <Info label="Experience">
                    {formatExperience(job.min_years, job.max_years)}
                  </Info>
                  <Info label="Language">{job.language || '—'}</Info>
                </div>
              </div>
            </section>

            <aside className="jv-side">
              <section className="jv-card">
                <h2>Manage this job</h2>
                <p className="jv-sub">Preview it or stop taking applicants</p>
                <div className="jv-manage">
                  <Link
                    to={`/company/jobs/${job.id}/preview`}
                    className="jv-btn jv-btn--outline"
                  >
                    <EyeIcon />
                    Preview as job seeker
                  </Link>
                  <button
                    type="button"
                    className="jv-btn jv-btn--danger"
                    onClick={() => setConfirmClose(true)}
                    disabled={isClosed}
                  >
                    <LockIcon />
                    {isClosed ? 'Job closed' : 'Close this job'}
                  </button>
                </div>
              </section>

              <section className="jv-card">
                <h2>Job details</h2>
                <div className="jv-rows">
                  <Row label="Job type">
                    {job.job_type ? formatJobType(job.job_type) : '—'}
                  </Row>
                  <Row label="Work mode">
                    {job.work_mode ? formatWorkMode(job.work_mode) : '—'}
                  </Row>
                  <Row label="Location">{job.location || '—'}</Row>
                  <Row label="Deadline">
                    {job.deadline ? formatDeadline(job.deadline) : '—'}
                  </Row>
                  <Row label="Salary">
                    {job.salary ? `${formatSalary(job.salary)} / month` : 'Hidden'}
                  </Row>
                </div>
              </section>
            </aside>
          </div>

          {!isDraft && <HiringSummary jobId={job.id} />}
        </>
      )}

      <ConfirmDialog
        open={confirmClose}
        title="Close this job?"
        message="Job seekers will no longer see it or be able to apply."
        confirmLabel="Close job"
        danger
        onConfirm={() => {
          setConfirmClose(false)
          closeJob()
        }}
        onCancel={() => setConfirmClose(false)}
      />
    </main>
  )
}
