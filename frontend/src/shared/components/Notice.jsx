import '../styles/Notice.css'

// Coloured message bar: green (success) or red (error), with an optional × to close it.

export default function Notice({ notice, onClose }) {
  if (!notice) return null

  const isError = notice.type === 'error'
  return (
    <div
      className={`notice notice--${notice.type}`}
      role={isError ? 'alert' : 'status'}
    >
      <span className="notice__icon" aria-hidden="true">
        {isError ? '!' : '✓'}
      </span>
      <span className="notice__text">{notice.text}</span>
      {onClose && (
        <button
          type="button"
          className="notice__close"
          aria-label="Dismiss"
          onClick={onClose}
        >
          ×
        </button>
      )}
    </div>
  )
}
