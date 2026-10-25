import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getNotQualified } from '../data/applicants.js';
import '../styles/RejectApplicants.css';

// =====================================================================
// Reject applicants page (/company/jobs/:id/reject).
// Rejects everyone in the job's "Not qualified" tab at once.
//   Step 1: a box asks "Reject 42 applicants?" with the reasons.
//   Step 2: after "Reject", a message shows with Undo (10 seconds).
// =====================================================================

const UNDO_SECONDS = 10; // how long the employer has to press Undo

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
  const { count, reasons } = getNotQualified(id);

  // ---------- Page state ----------
  const [notify, setNotify] = useState(true); // "Notify each applicant" tick box
  const [rejected, setRejected] = useState(false); // false = show the box, true = show the message
  const [secondsLeft, setSecondsLeft] = useState(UNDO_SECONDS); // Undo countdown

  // ---------- Undo countdown ----------
  // After "Reject", count down 1 second at a time. At 0 the reject is final.
  useEffect(() => {
    if (!rejected || secondsLeft === 0) return;

    const timer = setTimeout(() => {
      const next = secondsLeft - 1;
      setSecondsLeft(next);
      if (next === 0) {
        // TODO (backend): POST /api/company/jobs/:id/reject-not-qualified  { notify }
        // (each rejected applicant gets their reason + a link to the AI CV Optimizer when notify is on)
        console.log('Reject not qualified applicants', { jobId: id, count, notify });
      }
    }, 1000);

    return () => clearTimeout(timer); // stop the timer if the page closes or Undo is pressed
  }, [rejected, secondsLeft, id, count, notify]);

  // ---------- Buttons ----------
  const reject = () => {
    setSecondsLeft(UNDO_SECONDS);
    setRejected(true);
  };
  const undo = () => setRejected(false); // nothing was sent yet, so just go back to the box

  return (
    <main className="rj">
      {!rejected ? (
        /* =================== Step 1: confirm box =================== */
        <section className="rj-dialog" role="dialog" aria-modal="true" aria-labelledby="rj-title">
          {/* red icon + title */}
          <div className="rj-head">
            <span className="rj-icon">{WarningIcon}</span>
            <div>
              <p className="rj-kicker">Not qualified tab · Reject all</p>
              <h1 id="rj-title">Reject {count} applicants?</h1>
            </div>
          </div>

          <p className="rj-text">
            They will move to the <b>Rejected</b> tab. Nothing is deleted. You can still open their CVs later.
          </p>

          {/* reasons, worked out by Fursa */}
          <div className="rj-reasons">
            <p className="rj-reasons__title">Reasons (filled in by Fursa)</p>
            {reasons.map((r) => (
              <div key={r.text} className="rj-reason">
                <span>{r.text}</span>
                <b>{r.count}</b>
              </div>
            ))}
          </div>

          {/* notify tick box */}
          <label className="rj-notify">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Notify each applicant with their reason and a link to the AI CV Optimizer
          </label>

          {/* buttons */}
          <div className="rj-actions">
            <Link to="/company/applicants" className="btn rj-cancel">Cancel</Link>
            <button type="button" className="btn rj-reject" onClick={reject}>
              Reject {count} applicants
            </button>
          </div>
        </section>
      ) : (
        /* =================== Step 2: done message =================== */
        <div className="rj-toast" role="status">
          <span className="rj-toast__text">
            {CheckIcon}
            {count} applicants rejected{notify ? ' and notified' : ''}.
          </span>

          {/* Undo only while the countdown is running */}
          {secondsLeft > 0 && (
            <button type="button" className="rj-undo" onClick={undo}>Undo ({secondsLeft}s)</button>
          )}

          <Link to="/company/applicants" className="rj-back">Back to applicants</Link>
        </div>
      )}
    </main>
  );
}
