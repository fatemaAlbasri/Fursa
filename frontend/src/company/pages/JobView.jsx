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
  formatExperience
} from '../../shared/utils/jobFormat.js'
import { toJobBody, jobToForm } from '../data/jobs.js'
import Notice from '../../shared/components/Notice.jsx'
import ConfirmDialog from '../../shared/components/ConfirmDialog.jsx'
import { BriefcaseIcon, LockIcon } from '../../shared/components/icons.jsx'
import '../styles/JobView.css'

// icons
const PencilIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13 7l4 4" />
  </svg>
)
const InfoIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16v.5" />
  </svg>
)

const EyeIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

// A small grey box: label on top, value under it
function Info({ label, children }) {
  return (
    <div className="jv-info">
      <span className="jv-info__label">{label}</span>
      <span className="jv-info__value">{children}</span>
    </div>
  )
}

// One row in "Job details": label on the left, value on the right
function Row({ label, children }) {
  return (
    <div className="jv-row">
      <span className="jv-row__label">{label}</span>
      <span className="jv-row__value">{children}</span>
    </div>
  )
}

export default function JobView({ startEditing = false }) {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  // "Post a job" sends { justPosted: true } → show the green bar on arrival
  const [notice, setNotice] = useState(
    location.state?.justPosted
      ? {
          type: 'success',
          text: 'Your job is live. Job seekers who match can now see and apply.'
        }
      : null
  )
  const [confirm, setConfirm] = useState(null)
  const [saving, setSaving] = useState(false)

  const editing = startEditing

  // Load the job (backend)
  useEffect(() => {
    api('/jobs/mine/' + id)
      .then((data) => setJob(data.job))
      .catch(() => setJob(false))
  }, [id])

  // Loading
  if (job === null) {
    return (
      <main className="container">
        <div className="jv-loading" role="status">
          <span className="jv-spinner" aria-hidden="true" />
          Loading job…
        </div>
      </main>
    )
  }

  // Not found ( pop-up )
  if (job === false) {
    return (
      <div className="jv-overlay">
        <div
          className="jv-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="jv-popup-title"
        >
          <span className="jv-popup__icon">{InfoIcon}</span>
          <h2 id="jv-popup-title">Job not found</h2>
          <p>This job doesn't exist, or it isn't one of your jobs.</p>
          <Link to="/company/jobs" className="btn btn--primary">
            Back to your jobs
          </Link>
        </div>
      </div>
    )
  }
  // A draft has nothing to show yet → open it straight in the edit form
  if (job.status === 'draft' && !startEditing) {
    return <Navigate to={`/company/jobs/${id}/edit`} replace />
  }

  // Values worked out from the job
  const roles = splitLines(job.responsibilities)
  const isClosed = job.status === 'closed'
  const isDraft = job.status === 'draft'
  const left = Math.max(0, daysLeft(job.deadline))

  // Buttons
  // status: 'draft' = keep it as a draft, 'open' = publish it / keep it live
  const saveChanges = (form, status) => {
    if (saving) return
    setSaving(true)
    api('/jobs/mine/' + id, {
      method: 'PUT',
      body: toJobBody(form, status)
    })
      .then((data) => {
        setJob(data.job)
        if (status === 'draft') {
          // Draft saved → stay in the form
          setNotice({
            type: 'success',
            text: 'Draft saved. Publish it when you are ready.'
          })
        } else if (isDraft) {
          // Draft just published → the job page with the green bar
          setNotice({
            type: 'success',
            text: 'Your job is live. Job seekers who match can now see and apply.'
          })
          navigate(`/company/jobs/${id}`, { replace: true })
        } else {
          // Live job saved → the job page with the green bar
          setNotice({
            type: 'success',
            text: 'Changes saved. Applicants have been re-ranked.'
          })
          navigate(`/company/jobs/${id}`, { replace: true })
        }
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
      .catch((err) =>
        setNotice({
          type: 'error',
          text: err.error || 'Something went wrong. Please try again.'
        })
      )
      .finally(() => setSaving(false))
  }

  // Close job
  const closeJob = () => {
    if (saving) return
    setSaving(true)
    api('/jobs/mine/' + id + '/close', { method: 'PATCH' })
      .then((data) => {
        setJob(data.job)
        setNotice({
          type: 'success',
          text: 'Job closed. Job seekers can no longer apply.'
        })
      })
      .catch((err) =>
        setNotice({
          type: 'error',
          text: err.error || 'Something went wrong. Please try again.'
        })
      )
      .finally(() => {
        setSaving(false)
        // the green/red bar is at the top of the page → scroll up so it's seen
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
  }

  // "Back to your jobs" opens the tab this job is in
  const backTab = isDraft
    ? 'draft'
    : isClosed || daysLeft(job.deadline) < 0
      ? 'closed'
      : 'active'
  const backTo =
    backTab === 'active' ? '/company/jobs' : `/company/jobs?tab=${backTab}`

  return (
    <main className="jv">
      <Link to={backTo} className="jv-back">
        ← Back to your jobs
      </Link>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      {/* ---------- Edit mode note (top of the page) ---------- */}
      {editing && (
        <p className="jv-warn" role="note">
          {InfoIcon}
          {isDraft
            ? "You are editing a draft. Job seekers can't see it until you publish it."
            : 'You are editing a live job. If you change the requirements, Fursa will re-rank all applicants.'}
        </p>
      )}

      {/* ---------- Header card: title + stats (view and edit) ---------- */}
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
                {PencilIcon}
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

        {/* a draft has no applicants yet, so no numbers */}
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
        /* =================== EDIT MODE =================== */
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
        /* =================== VIEW MODE =================== */
        <>
          <div className="jv-cols">
            {/* ----- LEFT: one card with description, responsibilities, requirements ----- */}
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

            {/* ----- RIGHT: manage first, then job details ----- */}
            <aside className="jv-side">
              <section className="jv-card">
                <h2>Manage this job</h2>
                <p className="jv-sub">Preview it or stop taking applicants</p>
                <div className="jv-manage">
                  <Link
                    to={`/company/jobs/${job.id}/preview`}
                    className="jv-btn jv-btn--outline"
                  >
                    {EyeIcon}
                    Preview as job seeker
                  </Link>
                  <button
                    type="button"
                    className="jv-btn jv-btn--danger"
                    onClick={() => setConfirm('close')}
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
                    {job.salary ? `BHD ${job.salary} / month` : 'Hidden'}
                  </Row>
                </div>
              </section>
            </aside>
          </div>

          {/* Hiring summary: not for drafts (no applicants yet) */}
          {!isDraft && <HiringSummary jobId={job.id} />}
        </>
      )}

      <ConfirmDialog
        open={confirm === 'close'}
        title="Close this job?"
        message="Job seekers will no longer see it or be able to apply."
        confirmLabel="Close job"
        danger
        onConfirm={() => {
          setConfirm(null)
          closeJob()
        }}
        onCancel={() => setConfirm(null)}
      />
    </main>
  )
}
