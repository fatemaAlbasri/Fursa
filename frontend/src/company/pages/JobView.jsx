import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import JobForm from '../components/JobForm.jsx';
import { getJob, formatDate, daysLeft } from '../data/jobs.js';
import './JobView.css';

function Info({ label, children }) {
  return (
    <div className="jv-info">
      <span className="jv-info__label">{label}</span>
      <span className="jv-info__value">{children}</span>
    </div>
  );
}

/**
 * View & edit one job.
 *  /company/jobs/:id        → view
 *  /company/jobs/:id/edit   → opens straight in edit mode
 */
export default function JobView({ startEditing = false }) {
  const { id } = useParams();
  const location = useLocation();
  const [job, setJob] = useState(() => getJob(id));
  const [editing, setEditing] = useState(startEditing);
  const [banner, setBanner] = useState(location.state?.justPosted ? 'posted' : null);

  const roles = job.responsibilities.split('\n').map((r) => r.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
  const isClosed = job.status === 'closed';
  const left = daysLeft(job.deadline);

  const saveChanges = (form) => {
    const updated = { ...job, ...form };
    // TODO (backend): PUT /api/company/jobs/:id  { ...updated }  → backend re-ranks applicants
    console.log('Save changes', updated);
    setJob(updated);
    setEditing(false);
    setBanner('saved');
  };

  const closeJob = () => {
    if (!window.confirm('Close this job? Job seekers will no longer see it or be able to apply.')) return;
    // TODO (backend): PATCH /api/company/jobs/:id  { status: 'closed' }
    setJob({ ...job, status: 'closed' });
  };

  return (
    <main className="container container--wide jv">
      <Link to="/company/jobs" className="jv-back">← Back to your jobs</Link>

      {!editing && banner && (
        <div className="jv-banner" role="status">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
          <span>{banner === 'saved'
            ? 'Changes saved. Applicants have been re-ranked.'
            : 'Your job is live. Job seekers who match can now see and apply.'}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setBanner(null)}>×</button>
        </div>
      )}

      {/* ---------- Header ---------- */}
      <section className="jv-hero">
        <div className="jv-hero__text">
          <div className="jv-tags">
            <span className={isClosed ? 'jv-tag jv-tag--closed' : 'jv-tag jv-tag--active'}>{isClosed ? 'Closed' : '● Active'}</span>
            <span className="jv-tag">{job.jobType}</span>
            <span className="jv-tag">{job.workMode}</span>
          </div>
          <h1>{job.title}</h1>
          <p>
            [Company A] · Posted {formatDate(job.postedOn)} ·{' '}
            {editing ? (
              /* edit page: deadline in the normal header colour, only the days left in red */
              <>Deadline {formatDate(job.deadline)} <span className="jv-deadline">({left} days left)</span></>
            ) : (
              <span className="jv-deadline">Deadline {formatDate(job.deadline)} ({left} days left)</span>
            )}
          </p>
        </div>
        {!editing && (
          <div className="jv-hero__actions">
            <button type="button" className="btn btn--white" onClick={() => setEditing(true)} disabled={isClosed}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></svg>
              Edit job
            </button>
            <Link to="/company/applicants" className="btn btn--primary">View applicants</Link>
          </div>
        )}
      </section>

      {/* ---------- Stats (view and edit) ---------- */}
      <div className="jv-stats">
        <div className="jv-stat"><b>{job.stats.applicants}</b><span>Applicants</span></div>
        <div className="jv-stat jv-stat--good"><b>{job.stats.qualified}</b><span>Qualified</span></div>
        <div className="jv-stat jv-stat--teal"><b>{job.stats.newCount}</b><span>New</span></div>
        <div className="jv-stat jv-stat--danger"><b>{left}</b><span>Days left</span></div>
      </div>

      {editing ? (
        /* ---------- EDIT MODE ---------- */
        <>
          <p className="jv-warn" role="note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16v.5" /></svg>
            You are editing a live job. If you change the requirements, Fursa will re-rank all applicants.
          </p>
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
        /* ---------- VIEW MODE ---------- */
        <>
          <div className="jv-cols">
            {/* left: description, roles and requirements, one under the other */}
            <div className="jv-stack">
              <section className="card jv-card">
                <h2>Job description</h2>
                <p className="jv-text">{job.description}</p>
              </section>
              <section className="card jv-card">
                <h2>Role &amp; responsibilities</h2>
                <ul className="jv-list">{roles.map((r) => <li key={r}>{r}</li>)}</ul>
              </section>
              <section className="card jv-card">
                <h2>Requirements</h2>
                <p className="hint">Applicants missing a <b>must-have</b> go to the Not qualified tab.</p>
                <div className="jv-skills">
                  {job.skills.map((s) => (
                    <span key={s.name} className={s.must ? 'jv-skill jv-skill--must' : 'jv-skill'}>
                      {s.name}{s.must && <em>MUST</em>}
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

            {/* right: job details, then manage */}
            <aside className="jv-side">
              <section className="card jv-card">
                <h2>Job details</h2>
                <Info label="Job type">{job.jobType}</Info>
                <Info label="Work mode">{job.workMode}</Info>
                <Info label="Location">{job.location}</Info>
                <Info label="Deadline">{formatDate(job.deadline)}</Info>
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
