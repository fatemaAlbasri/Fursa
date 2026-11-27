import { useState } from 'react'
import { api } from '../../shared/api.js'
import ConfirmDialog from '../../shared/components/ConfirmDialog.jsx'
import Notice from '../../shared/components/Notice.jsx'
import { formatShortDate } from '../utils/format.js'
import '../styles/CompanyReview.css'

// Admin only, on top of /admin/companies/:id: check a new company and approve or reject it.
// pending  → "Your decision": Approve / Reject, each saying what happens
// rejected → the reason that was sent + a small "Approve instead" (the company can also fix and send again)
// approved → just the status and the details
// Reject always asks for a reason (the company sees it in the app and by email).
const STATUS = {
  pending: { label: 'Waiting for review', text: "This company can't publish jobs until you decide." },
  approved: { label: 'Approved', text: 'This company can publish jobs.' },
  rejected: { label: 'Not approved', text: "This company can't publish jobs or pay for a plan." }
}

export default function CompanyReview({ companyId, companyName, review, onChange }) {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  const decide = async (decision, body) => {
    setBusy(true)
    setNotice(null)
    try {
      const { company } = await api(`/admin/companies/${companyId}/${decision}`, { method: 'PATCH', body })
      onChange({
        ...review,
        status: company.status,
        rejection_reason: company.rejection_reason,
        reviewed_at: new Date().toISOString(),
        resubmitted_at: null,
        review_note: null
      })
      setRejecting(false)
      setNotice({
        type: 'success',
        text:
          company.status === 'approved'
            ? `${companyName} is approved. We let them know.`
            : `${companyName} was not approved. We sent them your reason.`
      })
    } catch (err) {
      if (err.fields?.reason) setReasonError(err.error)
      else {
        setRejecting(false)
        setNotice({ type: 'error', text: err.error || 'Could not save the decision.' })
      }
    } finally {
      setBusy(false)
    }
  }

  const openReject = () => {
    setReason('')
    setReasonError('')
    setRejecting(true)
  }
  const confirmReject = () => {
    if (!reason.trim()) return setReasonError('Write the reason. The company will see it.')
    decide('reject', { reason: reason.trim() })
  }

  const s = STATUS[review.status] || STATUS.pending
  const sentAgain = review.status === 'pending' && review.resubmitted_at

  return (
    <section className="cr" aria-label="Company review">
      <div className="cr__head">
        <div>
          <div className="cr__title">
            <h2>Company review</h2>
            <span className={`cr__status cr__status--${review.status}`}>{sentAgain ? 'Sent again' : s.label}</span>
          </div>
          <p className="cr__text">
            {s.text}
            {review.reviewed_at && review.status !== 'pending' && ` Decided on ${formatShortDate(review.reviewed_at)}.`}
          </p>
        </div>

        {/* rejected: a quiet way back, not a big box */}
        {review.status === 'rejected' && (
          <div className="cr__undo">
            <button type="button" className="btn btn--outline cr__btn-sm" disabled={busy} onClick={() => decide('approve')}>
              {busy ? 'Saving…' : 'Approve instead'}
            </button>
            <span>They can publish jobs, and we tell them.</span>
          </div>
        )}
      </div>

      {/* what the admin checks */}
      <dl className="cr__facts">
        <div>
          <dt>CR number</dt>
          <dd className="cr__cr">{review.cr_number || '—'}</dd>
        </div>
        <div>
          <dt>HR contact</dt>
          <dd>
            {review.hr.name}
            <br />
            <a href={`mailto:${review.hr.email}`}>{review.hr.email}</a>
          </dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{review.phone || '—'}</dd>
        </div>
      </dl>

      {/* sent again after a rejection: what was wrong before + what they wrote */}
      {sentAgain && (
        <div className="cr__box cr__box--info">
          <p>
            <b>They fixed their details and sent them again on {formatShortDate(review.resubmitted_at)}.</b>
          </p>
          {review.rejection_reason && (
            <p>
              Your last reason: <i>{review.rejection_reason}</i>
            </p>
          )}
          {review.review_note && (
            <p>
              Their note: <i>{review.review_note}</i>
            </p>
          )}
        </div>
      )}

      {review.status === 'rejected' && review.rejection_reason && (
        <div className="cr__box cr__box--reason">
          <p>
            <b>Reason sent to the company</b>
          </p>
          <p>{review.rejection_reason}</p>
          <p className="cr__muted">They can fix their details and send them again. You'll see them under “Waiting for review”.</p>
        </div>
      )}

      {/* pending: the decision, each button says what happens */}
      {review.status === 'pending' && (
        <div className="cr__decide">
          <div className="cr__option">
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => decide('approve')}>
              {busy && !rejecting ? 'Saving…' : 'Approve'}
            </button>
            <p>They can publish jobs and pay for their plan right away. We tell them in the app and by email.</p>
          </div>
          <div className="cr__option">
            <button type="button" className="btn btn--outline cr__reject" disabled={busy} onClick={openReject}>
              Reject
            </button>
            <p>They can't publish jobs. You write the reason, and they can fix it and send it again.</p>
          </div>
        </div>
      )}

      <Notice notice={notice} onClose={() => setNotice(null)} />

      <ConfirmDialog
        open={rejecting}
        title={`Reject ${companyName}?`}
        message="They won't be able to publish jobs. We'll send them this reason in the app and by email."
        confirmLabel="Reject company"
        danger
        busy={busy}
        onConfirm={confirmReject}
        onCancel={() => setRejecting(false)}
      >
        <label className="cr__field">
          <span>Reason for the company</span>
          <textarea
            rows={4}
            maxLength={500}
            value={reason}
            autoFocus
            onChange={(e) => {
              setReason(e.target.value)
              setReasonError('')
            }}
            placeholder="e.g. The CR number doesn't match the company name. Please check it and send it again."
          />
          <span className="cr__count">{reason.length}/500</span>
          {reasonError && (
            <span className="cr__error" role="alert">
              {reasonError}
            </span>
          )}
        </label>
      </ConfirmDialog>
    </section>
  )
}
