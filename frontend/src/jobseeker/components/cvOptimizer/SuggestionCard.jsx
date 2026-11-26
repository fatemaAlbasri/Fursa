import { useState } from 'react'
import { CheckIcon } from '../../../shared/components/icons.jsx'
import { pointsLabel } from '../../utils/cvFormat.js'

const STATUS_LABEL = { accepted: 'Accepted', pending: 'Not decided yet', dismissed: 'Dismissed' }

// One rewrite: section, points, Before / After, why, and Accept · Dismiss (or Undo once decided).
// variant "preview" = the free card on the optimizer page, "report" = a card in the Advanced report.
// onDecide(id, status) saves the status and returns an error message or null.
// busy = any suggestion is saving (buttons disabled on every card); saving = this one is.
// plain = no card box of its own (when it sits inside another card).
export default function SuggestionCard({ suggestion: s, variant = 'report', busy = false, saving = false, plain = false, onDecide }) {
  const [error, setError] = useState('')
  const isNew = !s.beforeText // a section the CV doesn't have yet
  const showStatus = variant === 'report' || s.status !== 'pending'
  const points = s.points > 0 && <span className="cvo-points">{pointsLabel(s.points)}</span>

  async function decide(status) {
    setError('')
    const message = await onDecide(s.id, status)
    if (message) setError(message)
  }

  return (
    <article id={`cvo-s-${s.id}`} className={`${plain ? '' : 'cvo-card '}cvo-sugg cvo-sugg--${s.status}`}>
      <div className="cvo-sugg__head">
        <span className="cvo-chip">{s.section}</span>
        {variant === 'preview' && s.isFreePreview && <span className="cvo-tag cvo-tag--free">Free preview</span>}
        {isNew && <span className="cvo-tag">New section</span>}
        {variant === 'report' && points}
        <span className="cvo-sugg__end">
          {variant === 'preview' && points}
          {showStatus && (
            <span className={`cvo-status cvo-status--${s.status}`}>
              {s.status === 'accepted' && <CheckIcon />}
              {STATUS_LABEL[s.status]}
            </span>
          )}
        </span>
      </div>

      <div className="cvo-diff">
        <div className="cvo-diff__box cvo-diff__box--before">
          <span className="cvo-diff__label">Before</span>
          {isNew ? (
            <p className="cvo-diff__empty">Not in your CV yet</p>
          ) : (
            <p className="cvo-diff__text">
              <del>{s.beforeText}</del>
            </p>
          )}
        </div>
        <div className="cvo-diff__box cvo-diff__box--after">
          <span className="cvo-diff__label">After</span>
          <p className="cvo-diff__text">{s.afterText}</p>
        </div>
      </div>

      {s.reason && (
        <p className="cvo-why">
          <strong>Why:</strong> {s.reason}
        </p>
      )}

      <div className="cvo-sugg__actions">
        {s.status === 'pending' ? (
          <>
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => decide('accepted')}>
              Accept
            </button>
            <button type="button" className="btn cvo-btn-quiet" disabled={busy} onClick={() => decide('dismissed')}>
              Dismiss
            </button>
          </>
        ) : (
          <button type="button" className="btn cvo-btn-quiet" disabled={busy} onClick={() => decide('pending')}>
            Undo
          </button>
        )}
        {saving && <span className="cvo-saving" role="status">Saving…</span>}
      </div>
      {error && (
        <p className="cvo-error" role="alert">
          {error}
        </p>
      )}
    </article>
  )
}
