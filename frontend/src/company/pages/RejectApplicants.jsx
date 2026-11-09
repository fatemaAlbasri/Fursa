import { useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { api } from '../../shared/api.js';
import '../styles/RejectApplicants.css';

// =====================================================================
// Reject applicants page (/company/jobs/:id/reject).
// Rejects the applicants ticked on the Applicants page, with one reason.
//   Step 1: a box asks "Reject 12 applicants?" with the reason + notify.
//   Step 2: a message says it's done.
// =====================================================================

const REASONS = ['Missing a must-have skill', 'Not enough experience', 'Position filled', 'Other'];

// ---------- Small icons used on this page ----------
const WarningIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16h.01" />
  </svg>
);
const CheckIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M5 12l5 5 9-10" />
  </svg>
);

export default function RejectApplicants() {
  const { id } = useParams(); // the job id from the URL
  const { state } = useLocation(); // { applicantIds, allNotQualified } from the Applicants page
  const ids = state?.applicantIds || [];

  // ---------- Page state ----------
  // Fursa fills the reason when everyone ticked is missing a must-have
  const [reason, setReason] = useState(state?.allNotQualified ? REASONS[0] : REASONS[1]);
  const [otherReason, setOtherReason] = useState('');
  const [notify, setNotify] = useState(true); // "Notify each applicant" tick box
  const [result, setResult] = useState(null); // { updated, skipped } once rejected
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Opened directly (nobody ticked) → back to the list
  if (ids.length === 0) return <Navigate to="/company/applicants" replace />;

  // ---------- Button ----------
  const reject = async () => {
    const text = reason === 'Other' ? otherReason.trim() : reason;
    if (!text) return setError('Write the reason for the applicants.');
    setBusy(true);
    setError('');
    try {
      const data = await api(`/jobs/mine/${id}/applicants`, {
        method: 'PATCH',
        body: { ids, status: 'rejected', reason: text, notify }
      });
      setResult(data);
    } catch (err) {
      setError(err.error || 'Could not reject. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="rj">
      {!result ? (
        /* =================== Step 1: confirm box =================== */
        <section className="rj-dialog" role="dialog" aria-modal="true" aria-labelledby="rj-title">
          {/* red icon + title */}
          <div className="rj-head">
            <span className="rj-icon">{WarningIcon}</span>
            <div>
              <p className="rj-kicker">Reject selected</p>
              <h1 id="rj-title">Reject {ids.length} applicants?</h1>
            </div>
          </div>

          <p className="rj-text">
            They will move to the <b>Rejected</b> tab. Nothing is deleted. You can still open their CVs later.
          </p>

          {/* one reason for everyone, sent to each applicant */}
          <div className="rj-reasons">
            <label className="rj-reasons__title" htmlFor="rj-reason">Reason (sent to each applicant)</label>
            <select id="rj-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            {reason === 'Other' && (
              <input type="text" maxLength={300} aria-label="Write the reason"
                value={otherReason} onChange={(e) => setOtherReason(e.target.value)} />
            )}
          </div>
          {error && <p className="field__error" role="alert">{error}</p>}

          {/* notify tick box */}
          <label className="rj-notify">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Notify each applicant with their reason and a link to the AI CV Optimizer
          </label>

          {/* buttons */}
          <div className="rj-actions">
            <Link to="/company/applicants" className="btn rj-cancel">Cancel</Link>
            <button type="button" className="btn rj-reject" onClick={reject} disabled={busy}>
              {busy ? 'Rejecting…' : `Reject ${ids.length} applicants`}
            </button>
          </div>
        </section>
      ) : (
        /* =================== Step 2: done message =================== */
        <div className="rj-toast" role="status">
          <span className="rj-toast__text">
            {CheckIcon}
            {result.updated.length} applicants rejected{notify ? ' and notified' : ''}.
            {result.skipped.length > 0 && ` ${result.skipped.length} skipped (already accepted or rejected).`}
          </span>

          <Link to="/company/applicants" className="rj-back">Back to applicants</Link>
        </div>
      )}
    </main>
  );
}
