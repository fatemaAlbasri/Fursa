import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../shared/api.js';
import { userInitials } from '../../shared/utils/jobFormat.js';
import { STATUS_LABELS, avatarColor } from '../data/applicants.js';
import StatusPill from '../../shared/components/StatusPill';
import ScoreRing from '../components/ScoreRing.jsx';
import '../styles/ApplicantView.css';

// =====================================================================
// One applicant's page (/company/jobs/:id/applicants/:appId).
// Wireframes "14a–14e · Employer applicant": the right column changes with the status:
// New → Shortlist / Reject · Shortlisted → Schedule an interview · Interview → Accept / Reject
// Accepted → contact details · Rejected → reason sent + Undo
// =====================================================================

const REASONS = ['Missing a must-have skill', 'Not enough experience', 'Position filled', 'Other'];

// One line per history step: text + dot colour
const HISTORY = {
  applied: ['Applied', '#159A9C'],
  shortlisted: ['Shortlisted by you', '#0284C7'],
  interview: ['Interview invite sent', '#6D4AFF'],
  accepted: ['Accepted · offer sent', '#12B76A'],
  rejected: ['Rejected by you', '#D92D20'],
};

// Interview times are saved as Bahrain time (the backend reads date + time as +03:00)
const TIME_ZONE = 'Asia/Bahrain';

// Logos and CVs are saved as "/uploads/..." on the backend server (not under /api)
const SERVER = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

// "2026-10-09T..." → "9 Oct"
const shortDate = (date) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TIME_ZONE });

// Interview time → "Tue, 20 Oct · 10:00 AM"
function interviewTime(date) {
  const d = new Date(date);
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: TIME_ZONE });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TIME_ZONE });
  return `${weekday}, ${shortDate(d)} · ${time}`;
}

// Interview → the schedule form's values (used by Reschedule)
function interviewToForm(interview) {
  if (!interview) return { date: '', time: '', type: 'in_person', location: '', note: '' };
  const d = new Date(interview.scheduled_at);
  return {
    date: d.toLocaleDateString('en-CA', { timeZone: TIME_ZONE }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour23: false, timeZone: TIME_ZONE }),
    type: interview.type,
    location: interview.location_or_link,
    note: interview.note_to_applicant || '',
  };
}

// What the applicant said about the interview
const INTERVIEW_REPLY = {
  invited: ['apd-reply', 'Waiting for the applicant to confirm'],
  confirmed: ['apd-reply apd-reply--ok', '✓ Applicant confirmed attendance'],
  reschedule_requested: ['apd-reply apd-reply--warn', 'Applicant asked for another time'],
};

// Schedule (or reschedule) an interview: Date · Time · Type · Location · Note
function ScheduleForm({ initial, errors, busy, submitLabel, onSubmit, children }) {
  const [form, setForm] = useState(initial);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <>
      <div className="apd-two">
        <div>
          <label htmlFor="apd-date">Date</label>
          <input id="apd-date" type="date" value={form.date} onChange={set('date')} />
        </div>
        <div>
          <label htmlFor="apd-time">Time</label>
          <input id="apd-time" type="time" value={form.time} onChange={set('time')} />
        </div>
      </div>
      {errors.date && <p className="field__error">{errors.date}</p>}
      <div>
        <label htmlFor="apd-type">Type</label>
        <select id="apd-type" value={form.type} onChange={set('type')}>
          <option value="in_person">In person</option>
          <option value="online">Online</option>
        </select>
      </div>
      <div>
        <label htmlFor="apd-loc">Location or meeting link</label>
        <input id="apd-loc" type="text" value={form.location} onChange={set('location')}
          placeholder={form.type === 'online' ? 'Meeting link' : 'Office address'} />
        {errors.location && <p className="field__error">{errors.location}</p>}
      </div>
      <div>
        <label htmlFor="apd-note">Note to applicant (optional)</label>
        <textarea id="apd-note" rows="2" value={form.note} onChange={set('note')}
          placeholder="e.g. Bring your Laptop" />
      </div>
      <button type="button" className="apd-btn apd-btn--blue" disabled={busy} onClick={() => onSubmit(form)}>
        {busy ? 'Sending…' : submitLabel}
      </button>
      {children}
    </>
  );
}

export default function ApplicantView() {
  const { id, appId } = useParams(); // job id + application id

  // ---------- Page state ----------
  const [data, setData] = useState(null); // { applicant, interview, history }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false); // the "Reject this applicant?" box is open
  const [reason, setReason] = useState(REASONS[0]);
  const [reasonNote, setReasonNote] = useState(''); // written reason when "Other" is picked
  const [rescheduling, setRescheduling] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [notes, setNotes] = useState(''); // private interview notes
  const [notesSaved, setNotesSaved] = useState(false);

  // ---------- Load from the backend ----------
  const load = () =>
    api(`/jobs/mine/${id}/applicants/${appId}`)
      .then((res) => {
        setData(res);
        setNotes(res.interview?.employer_notes || '');
      })
      .catch((err) => setError(err.error || 'Could not load the applicant.'));

  useEffect(() => {
    load();
  }, [id, appId]);

  if (!data) {
    return (
      <main className="container container--wide apd">
        <Link to="/company/applicants" state={{ jobId: Number(id) }} className="apd-back">← Back to applicants</Link>
        {error ? <p className="field__error" role="alert">{error}</p> : <p className="apd-muted">Loading…</p>}
      </main>
    );
  }

  const { applicant: a, interview, history } = data;
  const status = a.status;

  // ✓ only when we can be sure from the applicant's profile (same check as the job details page)
  const majorOk = Boolean(a.major && a.field && a.major.trim().toLowerCase() === a.field.trim().toLowerCase());
  const experienceOk = a.years_experience != null && Number(a.years_experience) >= a.min_years;
  const years = Number(a.years_experience || 0);

  // date of the last move to a status (for "Offer sent · 9 Oct" / "REJECTED · 1 Oct")
  const movedOn = (to) => {
    const step = [...history].reverse().find((h) => h.to_status === to);
    return step ? shortDate(step.changed_at) : '';
  };

  const isPdf = /\.pdf$/i.test(a.cv_url || '');
  
  const downloadCv = async () => {
    try {
      const res = await fetch(SERVER + a.cv_url);
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = a.cv_file_name || 'cv';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not download the CV.');
    }
  };

  // ---------- Buttons ----------
  // Every change goes to the backend, then the page reloads the applicant (status, history, interview)
  const run = async (work) => {
    setBusy(true);
    setError('');
    try {
      await work();
      await load();
      return true;
    } catch (err) {
      setError(err.error || 'Something went wrong. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const moveTo = (to, extra = {}) =>
    run(() => api(`/jobs/mine/${id}/applicants/${appId}`, { method: 'PATCH', body: { status: to, ...extra } }));

  const confirmReject = async () => {
    const text = reason === 'Other' ? reasonNote.trim() : reason;
    if (!text) return setError('Write the reason for the applicant.');
    if (await moveTo('rejected', { reason: text })) setRejecting(false);
  };

  const sendInvite = async (form) => {
    setFormErrors({});
    const ok = await run(() =>
      api(`/jobs/mine/${id}/applicants/${appId}/interview`, { method: 'POST', body: form }).catch((err) => {
        setFormErrors(err.errors || {});
        throw err;
      })
    );
    if (ok) setRescheduling(false);
  };

  const saveNotes = async () => {
    if (notes === (interview?.employer_notes || '')) return;
    try {
      await api(`/jobs/mine/${id}/applicants/${appId}/interview/notes`, { method: 'PATCH', body: { notes } });
      setData({ ...data, interview: { ...interview, employer_notes: notes } });
      setNotesSaved(true);
    } catch (err) {
      setError(err.error || 'Could not save the notes.');
    }
  };

  const openReject = () => {
    setRejecting(true);
    setError('');
  };

  // Reject button under each "next step" box
  const rejectButton = (
    <button type="button" className="apd-btn apd-btn--reject" disabled={busy} onClick={openReject}>Reject</button>
  );

  return (
    <main className="container container--wide apd">
      <Link to="/company/applicants" state={{ jobId: Number(id) }} className="apd-back">← Back to applicants</Link>

      {/* ---------- Name · job · score · status ---------- */}
      <section className="apd-head">
        <span className="apd-avatar" style={{ background: avatarColor(a) }}>{userInitials(a.first_name, a.last_name)}</span>
        <div className="apd-head__who">
          <h1>{a.first_name} {a.last_name}</h1>
          <p>
            Applied for <b>{a.job_title}</b> · {shortDate(a.applied_at)}
            {a.rank != null && ` · Rank #${a.rank}`}
          </p>
        </div>
        <ScoreRing score={a.score} size={76} className="ap-score apd-score" />
        <StatusPill status={STATUS_LABELS[status]} />
      </section>

      {error && <p className="field__error" role="alert">{error}</p>}

      <div className="apd-body">
        {/* ---------- Left: why this score + CV ---------- */}
        <div className="apd-main">
          <section className="apd-card">
            <h2>Why this score (AI match)</h2>
            {a.skills.length > 0 && (
              <div className="apd-skills">
                {a.skills.map((s) => (
                  <div key={s.name} className={s.has ? 'apd-skill apd-skill--has' : 'apd-skill apd-skill--missing'}>
                    <span>
                      <b>{s.name}</b>
                      {s.required && <span className="apd-must"> Must-have</span>}
                    </span>
                    <b className="apd-skill__mark">{s.has ? '✓ In CV' : '– Not in CV'}</b>
                  </div>
                ))}
              </div>
            )}
            <div className="apd-facts">
              <div className="apd-fact">
                <span>{a.major_must_have ? 'Major (must-have)' : 'Major'}</span>
                <b>{a.major || '—'}{majorOk && ' ✓'}</b>
              </div>
              <div className="apd-fact">
                <span>Experience</span>
                <b>{a.years_experience == null ? '—' : years === 0 ? 'No experience' : `${years} ${years === 1 ? 'year' : 'years'}`}{experienceOk && ' ✓'}</b>
              </div>
              {a.language && (
                <div className="apd-fact">
                  <span>Language (required)</span>
                  <b>{a.language}</b>
                </div>
              )}
            </div>
          </section>

          <section className="apd-card">
            <div className="apd-cv__head">
              <h2>CV</h2>
              <div className="apd-cv__actions">
                <button type="button" className="apd-btn apd-btn--plain" onClick={downloadCv}>Download</button>
              </div>
            </div>
            {isPdf ? (
              <iframe className="apd-cv__preview" src={SERVER + a.cv_url} title={`CV of ${a.first_name} ${a.last_name}`} />
            ) : (
              <p className="apd-cv__file">{a.cv_file_name}</p>
            )}
          </section>
        </div>

        {/* ---------- Right: next step (changes with the status) + history ---------- */}
        <aside className="apd-side">
          {status === 'applied' && !rejecting && (
            <section className="apd-card apd-step apd-step--teal">
              <p className="apd-kicker">NEXT STEP</p>
              <h2>New applicant · decide</h2>
              <p className="apd-muted">Shortlist to move forward, or reject with a reason.</p>
              <button type="button" className="apd-btn apd-btn--teal" disabled={busy} onClick={() => moveTo('shortlisted')}>
                Shortlist
              </button>
              {rejectButton}
            </section>
          )}

          {status === 'shortlisted' && !rejecting && (
            <section className="apd-card apd-step apd-step--blue">
              <p className="apd-kicker">NEXT STEP</p>
              <h2>Schedule an interview</h2>
              <ScheduleForm initial={interviewToForm(null)} errors={formErrors} busy={busy}
                submitLabel="Send interview invite" onSubmit={sendInvite}>
                {rejectButton}
              </ScheduleForm>
            </section>
          )}

          {status === 'interview' && !rejecting && rescheduling && (
            <section className="apd-card apd-step apd-step--blue">
              <p className="apd-kicker">RESCHEDULE</p>
              <h2>Pick a new time</h2>
              <ScheduleForm initial={interviewToForm(interview)} errors={formErrors} busy={busy}
                submitLabel="Send new time" onSubmit={sendInvite}>
                <button type="button" className="apd-btn apd-btn--plain" disabled={busy}
                  onClick={() => { setRescheduling(false); setFormErrors({}); }}>
                  Cancel
                </button>
              </ScheduleForm>
            </section>
          )}

          {status === 'interview' && !rejecting && !rescheduling && (
            <section className="apd-card apd-step apd-step--purple">
              <p className="apd-kicker">INTERVIEW</p>
              {interview && (
                <>
                  <h2>{interviewTime(interview.scheduled_at)}</h2>
                  <p className="apd-muted">
                    {interview.type === 'online' ? 'Online' : 'In person'} · {interview.location_or_link}
                  </p>
                  {INTERVIEW_REPLY[interview.status] && (
                    <p className={INTERVIEW_REPLY[interview.status][0]}>{INTERVIEW_REPLY[interview.status][1]}</p>
                  )}
                  <div>
                    <label htmlFor="apd-notes">Interview notes (private)</label>
                    <textarea id="apd-notes" rows="3" value={notes} placeholder="How did it go?"
                      onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }} onBlur={saveNotes} />
                    {notesSaved && <span className="apd-saved">Saved</span>}
                  </div>
                </>
              )}
              <button type="button" className="apd-btn apd-btn--green" disabled={busy} onClick={() => moveTo('accepted')}>
                Accept · send offer
              </button>
              {rejectButton}
              <button type="button" className="apd-btn apd-btn--link" disabled={busy}
                onClick={() => { setRescheduling(true); setError(''); }}>
                Reschedule
              </button>
            </section>
          )}

          {rejecting && (
            <section className="apd-card apd-step apd-step--red">
              <h2>Reject this applicant?</h2>
              <div>
                <label htmlFor="apd-reason">Reason (sent to the applicant)</label>
                <select id="apd-reason" value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }}>
                  {REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              {/* the writing box shows only for "Other" */}
              {reason === 'Other' && (
                <div>
                  <label htmlFor="apd-reason-note">Write the reason</label>
                  <textarea id="apd-reason-note" rows="3" maxLength={300} value={reasonNote} autoFocus
                    onChange={(e) => setReasonNote(e.target.value)}
                    placeholder="e.g. We need someone with at least one year of React experience." />
                </div>
              )}
              <button type="button" className="apd-btn apd-btn--red" disabled={busy} onClick={confirmReject}>
                {busy ? 'Rejecting…' : 'Reject & notify'}
              </button>
              <button type="button" className="apd-btn apd-btn--plain" disabled={busy}
                onClick={() => { setRejecting(false); setError(''); }}>
                Cancel
              </button>
            </section>
          )}

          {status === 'accepted' && (
            <section className="apd-card apd-step apd-step--hired">
              <p className="apd-kicker">HIRED</p>
              <h2>Offer sent · {movedOn('accepted')}</h2>
              <p>The applicant was notified. Contact them to agree the start date.</p>
              <div className="apd-contact">
                <div><b>Email:</b> <a href={`mailto:${a.email}`}>{a.email}</a></div>
                {a.phone && <div><b>Phone:</b> {a.phone}</div>}
              </div>
              <Link to={`/company/jobs/${id}`} className="apd-btn apd-btn--outline-red">Position filled? Close this job</Link>
            </section>
          )}

          {status === 'rejected' && (
            <section className="apd-card apd-step apd-step--rejected">
              <p className="apd-kicker">REJECTED · {movedOn('rejected')}</p>
              <h2>Applicant notified</h2>
              {a.rejection_reason && (
                <div className="apd-contact"><b>Reason sent:</b> {a.rejection_reason}</div>
              )}
              <button type="button" className="apd-btn apd-btn--plain" disabled={busy} onClick={() => moveTo('shortlisted')}>
                Undo · move to shortlist
              </button>
            </section>
          )}

          {/* ---------- History ---------- */}
          <section className="apd-card apd-history">
            <h2>History</h2>
            {history.map((h, i) => (
              <div key={i} className="apd-history__step">
                <div className="apd-history__line">
                  <span className="apd-history__dot" style={{ background: HISTORY[h.to_status]?.[1] }} />
                  <span className="apd-history__bar" />
                </div>
                <div>
                  <b>{HISTORY[h.to_status]?.[0] ?? h.to_status}</b>
                  <span>{shortDate(h.changed_at)}</span>
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </main>
  );
}
