import { useEffect, useRef, useState } from 'react'
import { api } from '../../shared/api.js'
import { ButtonSpinner } from '../../shared/components/Loading.jsx'
import { WarningIcon, XIcon } from '../../shared/components/icons.jsx'
import '../../shared/styles/ConfirmDialog.css'
import '../styles/RejectDialog.css'

// One reason for everyone, sent to each applicant with their notification.
// PATCH /api/jobs/mine/:jobId/applicants { ids, status: 'rejected', reason, notify: true }
// onDone(result) gets { updated, skipped } from the backend.

const REASONS = ['Missing a must-have skill', 'Not enough experience', 'Position filled', 'Other']

export default function RejectDialog({ open, jobId, ids, sub, allNotQualified, onClose, onDone }) {
  const [reason, setReason] = useState(REASONS[0])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const box = useRef(null)

  // Fresh every time it opens; the page behind doesn't scroll
  useEffect(() => {
    if (!open) return
    setReason(allNotQualified ? REASONS[0] : REASONS[1])
    setNote('')
    setError('')
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    box.current?.querySelector('select')?.focus({ preventScroll: true })
    return () => {
      document.body.style.overflow = scroll
    }
  }, [open, allNotQualified])

  // Escape = Cancel (not while rejecting)
  useEffect(() => {
    if (!open || busy) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  const count = ids.length
  const people = `${count} ${count === 1 ? 'applicant' : 'applicants'}`

  async function reject() {
    const text = reason === 'Other' ? note.trim() : reason
    if (!text) return setError('Write the reason the applicants will see.')
    setBusy(true)
    setError('')
    try {
      const data = await api(`/jobs/mine/${jobId}/applicants`, {
        method: 'PATCH',
        body: { ids, status: 'rejected', reason: text, notify: true }
      })
      onDone(data)
    } catch (err) {
      setError(err.error || 'Could not reject. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-overlay rj-overlay" onClick={busy ? undefined : onClose}>
      <div
        ref={box}
        className="rj-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rj-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* red icon , title , close */}
        <div className="rj-head">
          <span className="rj-icon" aria-hidden="true">
            <WarningIcon />
          </span>
          <div className="rj-head__text">
            <h2 id="rj-title">Reject {people}?</h2>
            {sub && <p className="rj-sub">{sub}</p>}
          </div>
          <button type="button" className="rj-close" aria-label="Close" onClick={onClose} disabled={busy}>
            <XIcon />
          </button>
        </div>

        <p className="rj-text">
          They will move to the <b>Rejected</b> tab and each one will get a notification. Nothing is deleted, and you
          can still open their CVs later.
        </p>

        {/* one reason for everyone */}
        <div className="rj-reason">
          <label htmlFor="rj-reason">
            Reason <span>(sent to the applicants)</span>
          </label>
          <select
            id="rj-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setError('')
            }}
          >
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          {reason === 'Other' && (
            <>
              <textarea
                aria-label="Write the reason"
                rows="3"
                maxLength={300}
                value={note}
                autoFocus
                onChange={(e) => {
                  setNote(e.target.value)
                  setError('')
                }}
                placeholder="Write the reason the applicants will see"
              />
              <span className="rj-count">{note.length}/300</span>
            </>
          )}
          {error && (
            <p className="field__error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="rj-actions">
          <button type="button" className="rj-btn rj-btn--cancel" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="rj-btn rj-btn--reject" onClick={reject} disabled={busy} aria-busy={busy}>
            {busy && <ButtonSpinner />}
            {busy ? `Rejecting ${count}…` : `Reject ${people}`}
          </button>
        </div>
      </div>
    </div>
  )
}
