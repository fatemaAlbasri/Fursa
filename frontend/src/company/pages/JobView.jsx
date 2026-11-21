import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import JobForm from '../components/JobForm.jsx'
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

// A small grey box: label on top, value under it
function Info({ label, children }) {
  return (
    <div className="jv-info">
      <span className="jv-info__label">{label}</span>
      <span className="jv-info__value">{children}</span>
    </div>
  )
}

export default function JobView({ startEditing = false }) {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [notice, setNotice] = useState(
    location.state?.justPosted
      ? {
          type: 'success',
          text: 'Your job is live. Job seekers who match can now see and apply.'
        }
      : location.state?.justSaved
        ? { type: 'success', text: 'Changes saved.' }
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
          <Link to="/company/" className="btn btn--primary">
            Back to your jobs
          </Link>
        </div>
      </div>
    )
  }

  // Values worked out from the job
  const roles = splitLines(job.responsibilities)
  const isClosed = job.status === 'closed'
  const isDraft = job.status === 'draft'
  const left = Math.max(0, daysLeft(job.deadline))

  // Buttons
  // status: 'draft' = keep it as a draft, 'open' = publish it / keep it live
  const saveChanges = (form, status = isDraft ? 'draft' : 'open') => {
    if (saving) return
    setSaving(true)
    api('/jobs/mine/' + id, {
      method: 'PUT',
      body: toJobBody(form, status)
    })
      .then((data) => {
        setJob(data.job)
        setNotice({
          type: 'success',
          text:
            status === 'draft'
              ? 'Draft saved. Publish it when you are ready.'
              : isDraft
                ? 'Your job is live. Job seekers who match can now see and apply.'
                : 'Changes saved. Applicants have been re-ranked.'
        })

        navigate(`/company/jobs/${id}`, {
          replace: true,
          state: { justSaved: true }
        })
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

  // Draft
  const publishDraft = () => {
    if (saving) return
    setSaving(true)
    api('/jobs/mine/' + id, {
      method: 'PUT',
      body: toJobBody(jobToForm(job), 'open')
    })
      .then((data) => {
        setJob(data.job)
        setNotice({
          type: 'success',
          text: 'Your job is live. Job seekers who match can now see and apply.'
        })
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
      .finally(() => setSaving(false))
  }

  // Delete draft
  const deleteDraft = () => {
    setSaving(true)
    api('/jobs/mine/' + id, { method: 'DELETE' })
      .then(() => {
        navigate('/company', { replace: true })
      })
      .catch((err) => {
        setNotice({
          type: 'error',
          text: err.error || 'Something went wrong. Please try again.'
        })
        setSaving(false)
      })
  }

  return (
    <main className="container container--wide jv">
      <Link to="/company/jobs" className="jv-back">
        ← Back to your jobs
      </Link>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      {/* ---------- Draft notice + Publish button (view mode only) ---------- */}
      {!editing && isDraft && (
        <div className="jv-draft" role="status">
          {InfoIcon}
          <span>
            This job is a <b>draft</b>. Only you can see it. Publish it so job
            seekers can apply.
          </span>
          <button
            type="button"
            className="btn btn--primary"
            onClick={publishDraft}
            disabled={saving}
          >
            {saving ? 'Publishing…' : 'Publish job'}
          </button>
        </div>
      )}

      {/* ---------- Header ---------- */}
      <section className="jv-hero">
        <div className="jv-hero__text">
          <div className="jv-tags">
            <span className={`jv-tag jv-tag--${job.status}`}>
              {isDraft ? 'Draft' : isClosed ? 'Closed' : 'Active'}
            </span>
            <span className="jv-tag">{formatJobType(job.job_type)}</span>
            <span className="jv-tag">{formatWorkMode(job.work_mode)}</span>
          </div>

          <h1>{job.title}</h1>

          <p>
            <Link to="/company/profile" className="jv-company">
              {job.company_name || 'Your company'}
            </Link>{' '}
            · Posted {formatDeadline(job.created_at)} · Deadline{' '}
            {formatDeadline(job.deadline)}
          </p>
        </div>

        {/* header buttons (view mode only) */}
        {!editing && (
          <div className="jv-hero__actions">
            <button
              type="button"
              className="btn btn--white"
              onClick={() => navigate(`/company/jobs/${id}/edit`)}
              disabled={isClosed}
            >
              {PencilIcon}
              Edit job
            </button>
            <Link to="/company/applicants" className="btn btn--primary">
              View applicants
            </Link>
          </div>
        )}
      </section>

      {/* ---------- Stat boxes (view and edit) ---------- */}
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
        <div className="jv-stat jv-stat--danger">
          <b>{left}</b>
          <span>Days left</span>
        </div>
      </div>

      {editing ? (
        /* =================== EDIT MODE =================== */
        <>
          {/* orange note */}
          <p className="jv-warn" role="note">
            {InfoIcon}
            {isDraft
              ? "You are editing a draft. Job seekers can't see it until you publish it."
              : 'You are editing a live job. If you change the requirements, Fursa will re-rank all applicants.'}
          </p>

          {/* same form as "Post a job", filled with this job */}
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
                    checkTitleOnly: true, // a draft only needs a title
                    onClick: (form) => saveChanges(form, 'draft')
                  }
                : {
                    label: 'Cancel',
                    onClick: () => navigate(`/company/jobs/${id}`)
                  }
            }
          />
        </>
      ) : (
        /* =================== VIEW MODE =================== */
        <>
          <div className="jv-cols">
            {/* ----- LEFT column: description, responsibilities, requirements ----- */}
            <div className="jv-stack">
              <section className="card jv-card">
                <h2>Job description</h2>
                <p className="jv-text">{job.description}</p>
              </section>

              <section className="card jv-card">
                <h2>Role &amp; responsibilities</h2>
                <ul className="jv-list">
                  {roles.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </section>

              <section className="card jv-card">
                <h2>Requirements</h2>
                <p className="hint">
                  Applicants missing a <b>must-have</b> go to the Not qualified
                  tab.
                </p>

                {/* skills: must-have skills are filled teal with a MUST label */}
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
                  <Info label="Language">{job.language}</Info>
                </div>
              </section>
            </div>

            {/* ----- RIGHT column: job details, then manage ----- */}
            <aside className="jv-side">
              <section className="card jv-card">
                <h2>Job details</h2>
                <Info label="Job type">{formatJobType(job.job_type)}</Info>
                <Info label="Work mode">{formatWorkMode(job.work_mode)}</Info>
                <Info label="Location">{job.location}</Info>
                <Info label="Deadline">{formatDeadline(job.deadline)}</Info>
                <Info label="Salary">
                  {job.salary ? `BHD ${job.salary} / month` : 'Hidden'}
                </Info>
              </section>

              <section className="card jv-card">
                <h2>Manage</h2>
                {isDraft ? (
                  <button
                    type="button"
                    className="btn jv-close"
                    onClick={() => setConfirm('delete')}
                    disabled={saving}
                  >
                    Delete draft
                  </button>
                ) : (
                  <>
                    <Link
                      to={`/jobseeker/jobs/${job.id}`}
                      className="btn jv-preview"
                    >
                      Preview as job seeker
                    </Link>
                    <button
                      type="button"
                      className="btn jv-close"
                      onClick={() => setConfirm('close')}
                      disabled={isClosed}
                    >
                      {isClosed ? 'Job closed' : 'Close this job'}
                    </button>
                  </>
                )}
              </section>
            </aside>
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirm === 'delete'}
        title="Delete this draft?"
        message="This cannot be undone."
        confirmLabel="Delete draft"
        danger
        busy={saving}
        onConfirm={() => {
          setConfirm(null)
          deleteDraft()
        }}
        onCancel={() => setConfirm(null)}
      />

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
