import { SparkleIcon } from '../../../shared/components/icons.jsx'

// Teal icon square + title + one line under it (both optimizer pages)
export function PageHead({ title, sub, badge }) {
  return (
    <header className="cvo-head">
      <span className="cvo-head__icon" aria-hidden="true">
        <SparkleIcon />
      </span>
      <div className="cvo-head__text">
        <h1 className="cvo-head__title">{title}</h1>
        <p className="cvo-head__sub">{sub}</p>
      </div>
      {badge && <span className="cvo-badge">{badge}</span>}
    </header>
  )
}

export function ErrorState({ title, error, onRetry }) {
  return (
    <div className="cvo-card cvo-state cvo-state--error" role="alert">
      <h2 className="cvo-state__title">{title}</h2>
      <p className="cvo-muted">{error || 'Could not reach the server'}</p>
      <button type="button" className="btn btn--outline" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
