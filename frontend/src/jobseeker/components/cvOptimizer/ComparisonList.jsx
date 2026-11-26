import { CheckIcon } from '../../../shared/components/icons.jsx'

// "How your CV compares with strong … CVs" (review.comparison, Advanced report only)
export default function ComparisonList({ comparison, major }) {
  const met = comparison.filter((c) => c.met).length
  return (
    <section className="cvo-card cvo-panel cvo-compare">
      <div className="cvo-panel__head">
        <div>
          <h2 className="cvo-card__title">How your CV compares</h2>
          <p className="cvo-panel__sub">
            With strong {major || 'entry-level'} CVs · yours has{' '}
            <strong>
              {met} of {comparison.length}
            </strong>{' '}
            after the changes
          </p>
        </div>
      </div>
      <ul className="cvo-compare__list">
        {comparison.map((c) => (
          <li key={c.key} className={c.met ? 'cvo-compare__row cvo-compare__row--met' : 'cvo-compare__row'}>
            <span className="cvo-compare__mark" aria-hidden="true">
              {c.met ? <CheckIcon /> : '–'}
            </span>
            <span className="cvo-compare__label">{c.label}</span>
            <span className="cvo-compare__value">{c.met ? 'Yes' : 'Not yet'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
