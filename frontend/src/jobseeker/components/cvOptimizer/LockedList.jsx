import { LockIcon } from '../../../shared/components/icons.jsx'

// "5 more in the Advanced report": the locked suggestions (the backend only sends their section and line)
export default function LockedList({ suggestions, canUnlock, onUnlock }) {
  return (
    <section className="cvo-card cvo-locked">
      <header className="cvo-locked__head">
        <h2 className="cvo-card__title">
          {suggestions.length} more in the Advanced report
        </h2>
        {canUnlock && (
          <button type="button" className="cvo-link" onClick={onUnlock}>
            Unlock →
          </button>
        )}
      </header>
      <ul className="cvo-locked__list">
        {suggestions.map((s) => (
          <li key={s.id} className="cvo-locked__row">
            <LockIcon />
            <span className="cvo-locked__section">{s.section}</span>
            <span className="cvo-locked__text">{s.beforeText || 'New section'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
