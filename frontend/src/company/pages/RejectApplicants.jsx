import { useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { api } from '../../shared/api.js';
import '../styles/RejectApplicants.css';

const REASONS = ['Missing a must-have skill', "Skills don't match the role", 'Position filled', 'Other'];

// icons
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
  const { id } = useParams(); 
  const { state } = useLocation(); 
  const ids = state?.applicantIds || [];

  // Page state 
  const [reason, setReason] = useState(state?.allNotQualified ? REASONS[0] : REASONS[1]);
  const [note, setNote] = useState(''); 
  const [notify, setNotify] = useState(true); 
  const [result, setResult] = useState(null); 
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (ids.length === 0) return <Navigate to="/company/applicants" replace />;

  // Button
  const reject = async () => {
    const text = reason === 'Other' ? note.trim() : reason;
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
            <select id="rj-reason" value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }}>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            {/* the writing box shows only for "Other"*/}
            {reason === 'Other' && (
              <>
                <label className="rj-reasons__label" htmlFor="rj-note">Write the reason</label>
                <textarea id="rj-note" rows="3" maxLength={300} value={note} autoFocus
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. We need someone with at least one year of React experience." />
                <span className="rj-reasons__count">{note.length}/300</span>
              </>
            )}
          </div>
          {error && <p className="field__error" role="alert">{error}</p>}

          {/* notify tick box */}
          <label className="rj-notify">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Notify each applicant with their reason
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
        /* done message */
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
