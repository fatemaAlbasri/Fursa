import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import JobForm from '../components/JobForm.jsx';
import { api } from '../../shared/api.js';
import { formatJobType,formatWorkMode,formatDeadline , daysLeft } from '../../shared/utils/jobFormat.js';
import '../styles/JobView.css';

// =====================================================================
// View & edit ONE job (company side).
//   /company/jobs/:id        → opens in VIEW mode
//   /company/jobs/:id/edit   → opens straight in EDIT mode
// =====================================================================

// ---------- Small icons used on this page ----------
const CheckIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M5 12l5 5 9-10" />
  </svg>
);
const PencilIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13 7l4 4" />
  </svg>
);
const InfoIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16v.5" />
  </svg>
);

// A small grey box: label on top, value under it (e.g. "Job type / Full-time").
function Info({ label, children }) {
  return (
    <div className="jv-info">
      <span className="jv-info__label">{label}</span>
      <span className="jv-info__value">{children}</span>
    </div>
  );
}

export default function JobView({ startEditing = false }) {
  const { id } = useParams(); // the job id from the URL
  const location = useLocation();

  // ---------- Page state ----------
  const [job, setJob] = useState(null); // null = still loading, false = not found
  const [editing, setEditing] = useState(startEditing); // true = show the edit form
  // Green banner at the top: 'posted' (just published), 'saved' (just edited) or null (hidden).
  const [banner, setBanner] = useState(location.state?.justPosted ? 'posted' : null);

  // ---------- Load the job (from the backend) ----------
  // GET /api/jobs/mine/:id → { job }
  useEffect(() => {
    api('/jobs/mine/' + id)
      .then((data) => setJob(data.job))
      .catch(() => setJob(false)); // not found / not your job / server down
  }, [id]);

  // ---------- Company name (from the backend) ----------
  // Comes from the signed-in employer: GET /api/auth/me → user.company.name
  // TODO (backend): once GET /api/company/jobs/:id returns the company, use job.company.name instead.
  const [companyName, setCompanyName] = useState('');
  useEffect(() => {
    api('/auth/me')
      .then(({ user }) => setCompanyName(user.company?.name || ''))
      .catch(() => {}); // not signed in / server down → keep the fallback text
  }, []);

  // ---------- Wait for the job before using it ----------
  // Must come AFTER every useState / useEffect above.
  if (job === null) return <main className="container">Loading…</main>;
  if (job === false) return <main className="container">Job not found.</main>;

  // ---------- Values worked out from the job ----------
  // Responsibilities are saved as text, one per line → turn them into a list (and drop "-" or "•" at the start).
  const roles = (job.responsibilities || '')
    .split('\n')
    .map((r) => r.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);
  const isClosed = job.status === 'closed';
  const left = daysLeft(job.deadline);

  // ---------- Buttons ----------
  // "Save changes" in the edit form
  const saveChanges = (form) => {
    const updated = { ...job, ...form };
    // TODO (backend): PUT /api/company/jobs/:id  { ...updated }  → backend re-ranks applicants
    console.log('Save changes', updated);
    setJob(updated);
    setEditing(false);
    setBanner('saved');
  };

  // "Close this job" in the Manage box
  const closeJob = () => {
    if (!window.confirm('Close this job? Job seekers will no longer see it or be able to apply.')) return;
    // TODO (backend): PATCH /api/company/jobs/:id  { status: 'closed' }
    setJob({ ...job, status: 'closed' });
  };

  return (
    <main className="container container--wide jv">
      <Link to="/company/jobs" className="jv-back">← Back to your jobs</Link>

      {/* ---------- Green banner (view mode only) ---------- */}
      {!editing && banner && (
        <div className="jv-banner" role="status">
          {CheckIcon}
          <span>
            {banner === 'saved'
              ? 'Changes saved. Applicants have been re-ranked.'
              : 'Your job is live. Job seekers who match can now see and apply.'}
          </span>
          <button type="button" aria-label="Dismiss" onClick={() => setBanner(null)}>×</button>
        </div>
      )}

      {/* ---------- Header (navy band) ---------- */}
      <section className="jv-hero">
        <div className="jv-hero__text">
          {/* tags: Active/Closed · job type · work mode */}
          <div className="jv-tags">
            <span className={isClosed ? 'jv-tag jv-tag--closed' : 'jv-tag jv-tag--active'}>
              {isClosed ? 'Closed' : ' Active'}
            </span>
            <span className="jv-tag">{formatJobType(job.job_type)}</span>
            <span className="jv-tag">{formatWorkMode(job.work_mode)}</span>
          </div>

          <h1>{job.title}</h1>

          {/* Company name · Posted date · Deadline */}
          <p>
            {/* TODO: point this at the public company page once it exists */}
            <Link to="/company/profile" className="jv-company">{companyName || 'Your company'}</Link>
            {' '}· Posted {formatDeadline(job.postedOn)} · Deadline {formatDeadline(job.deadline)}
          </p>
        </div>

        {/* header buttons (view mode only) */}
        {!editing && (
          <div className="jv-hero__actions">
            <button type="button" className="btn btn--white" onClick={() => setEditing(true)} disabled={isClosed}>
              {PencilIcon}
              Edit job
            </button>
            <Link to="/company/applicants" className="btn btn--primary">View applicants</Link>
          </div>
        )}
      </section>

      {/* ---------- Stat boxes (view and edit) ---------- */}
      <div className="jv-stats">
        <div className="jv-stat"><b>{job.stats.applicants}</b><span>Applicants</span></div>
        <div className="jv-stat jv-stat--good"><b>{job.stats.qualified}</b><span>Qualified</span></div>
        <div className="jv-stat jv-stat--teal"><b>{job.stats.newCount}</b><span>New</span></div>
        <div className="jv-stat jv-stat--danger"><b>{left}</b><span>Days left</span></div>
      </div>

      {editing ? (
        /* =================== EDIT MODE =================== */
        <>
          {/* orange note */}
          <p className="jv-warn" role="note">
            {InfoIcon}
            You are editing a live job. If you change the requirements, Fursa will re-rank all applicants.
          </p>

          {/* same form as "Post a job", filled with this job */}
          <JobForm
            initial={job}
            stacked
            edit
            submitLabel="Save changes"
            onSubmit={saveChanges}
            secondary={{ label: 'Cancel', onClick: () => setEditing(false) }}
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
                  {roles.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </section>

              <section className="card jv-card">
                <h2>Requirements</h2>
                <p className="hint">Applicants missing a <b>must-have</b> go to the Not qualified tab.</p>

                {/* skills: must-have skills are filled teal with a MUST label */}
                <div className="jv-skills">
                  {job.skills.map((s) => (
                    <span key={s.name} className={s.must ? 'jv-skill jv-skill--must' : 'jv-skill'}>
                      {s.name}
                      {s.must && <em>MUST</em>}
                    </span>
                  ))}
                </div>

                <div className="jv-req-grid">
                  <Info label="Major">
                    {job.major}
                    {job.majorMust && <em className="jv-must">MUST</em>}
                  </Info>
                  <Info label="Experience">{job.experience}</Info>
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
                <Info label="Salary">{job.salary ? `BHD ${job.salary} / month` : 'Hidden'}</Info>
              </section>

              <section className="card jv-card">
                <h2>Manage</h2>
                <Link to={`/jobseeker/jobs/${job.id}`} className="btn jv-preview">Preview as job seeker</Link>
                <button type="button" className="btn jv-close" onClick={closeJob} disabled={isClosed}>
                  {isClosed ? 'Job closed' : 'Close this job'}
                </button>
              </section>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
