import { SECTION_LABELS, pointsText } from '../data/cvOptimizer.js'
import '../styles/CvSuggestion.css'

// One AI CV Optimizer suggestion. Used on the AI CV Optimizer page (free preview + locked rows)
// and on the Advanced CV report (all suggestions).
//
//   <CvSuggestion suggestion={s} status="pending" onAccept={...} onDismiss={...} />
//   <CvSuggestion suggestion={s} locked />        → small row with a lock, no Before/After
//
// The page keeps the statuses and the score; this card only shows them and reports clicks.

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

export default function CvSuggestion({
  suggestion,
  status = 'pending',
  locked = false,
  onAccept,
  onDismiss,
  onUndo
}) {
  const label = SECTION_LABELS[suggestion.section] || suggestion.section

  // Locked (not paid yet): only the section and a short hint of the change
  if (locked) {
    return (
      <li className="cvs-locked">
        <span className="cvs-locked__icon">
          <LockIcon />
        </span>
        <span className="cvs-locked__section">{label}</span>
        <span className="cvs-locked__text">{suggestion.teaser}</span>
      </li>
    )
  }

  return (
    <article className={`cvs-card cvs-card--${status}`} aria-label={`${label} suggestion`}>
      <div className="cvs-head">
        <span className="cvs-section">{label}</span>
        <span className="cvs-points">{pointsText(suggestion.points)}</span>
      </div>

      <div className="cvs-compare">
        <div className="cvs-box cvs-box--before">
          <span className="cvs-box__label">Before</span>
          <p className="cvs-box__text">
            <del>{suggestion.before_text}</del>
          </p>
        </div>
        <div className="cvs-box cvs-box--after">
          <span className="cvs-box__label">After</span>
          <p className="cvs-box__text">{suggestion.after_text}</p>
        </div>
      </div>

      {suggestion.reason && <p className="cvs-why">Why: {suggestion.reason}</p>}

      {status === 'pending' ? (
        <div className="cvs-actions">
          <button type="button" className="btn btn--primary" onClick={() => onAccept?.(suggestion.section)}>
            Accept
          </button>
          <button type="button" className="btn cvs-dismiss" onClick={() => onDismiss?.(suggestion.section)}>
            Dismiss
          </button>
        </div>
      ) : (
        // role="status" so screen readers hear the change after clicking Accept / Dismiss
        <div className="cvs-actions" role="status">
          <span className={`cvs-result cvs-result--${status}`}>
            {status === 'accepted'
              ? `✓ Accepted · ${pointsText(suggestion.points)} added`
              : 'Dismissed · your original text stays'}
          </span>
          {onUndo && (
            <button type="button" className="cvs-undo" onClick={() => onUndo(suggestion.section)}>
              Undo
            </button>
          )}
        </div>
      )}
    </article>
  )
}
