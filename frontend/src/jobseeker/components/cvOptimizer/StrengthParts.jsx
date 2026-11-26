import { scoreTone } from '../../utils/cvFormat.js'

// Pieces both optimizer pages share (wireframes 8 and 9)

// Score out of 100 in a ring: red under 50, amber under 75, green from 75 (scoreTone).
// faded = a score you could reach, not the one you have now. Circle length 2πr = 301.6 for r = 48.
export function StrengthRing({ score, label, sub, faded }) {
  return (
    <div className="cvo-ring2">
      <div className={`cvo-ring2__circle cvo-ring2--${scoreTone(score)}${faded ? ' cvo-ring2--faded' : ''}`}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="cvo-ring2__track" cx="60" cy="60" r="48" />
          <circle
            className="cvo-ring2__bar"
            cx="60"
            cy="60"
            r="48"
            style={{ strokeDasharray: `${((score / 100) * 301.6).toFixed(1)} 301.6` }}
          />
        </svg>
        <span className="cvo-ring2__value">{score}</span>
      </div>
      <span className="cvo-ring2__label">
        {label}
        {sub && <span className="cvo-ring2__sub">{sub}</span>}
      </span>
    </div>
  )
}

export const Arrow = () => (
  <svg className="cvo-ring2__arrow" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

// Card with a title + a grey line under it, split from the content by a thin line
export function Panel({ title, sub, action, className = '', children, ...rest }) {
  return (
    <section className={`cvo-card cvo-panel ${className}`} {...rest}>
      <div className="cvo-panel__head">
        <div>
          <h2 className="cvo-card__title">{title}</h2>
          {sub && <p className="cvo-panel__sub">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

// While the review loads: grey shapes in the same layout (wireframe 23)
export function ReviewLoading({ label = 'Loading your CV review' }) {
  const line = (width, thin) => <span className={thin ? 'sk sk--line sk--thin' : 'sk sk--line'} style={{ width }} />
  return (
    <div className="cvo-loading" role="status" aria-label={label}>
      <section className="cvo-card cvo-panel" aria-hidden="true">
        <div className="cvo-panel__head">
          <div className="cvo-loading__lines">
            {line(160)}
            {line(220, true)}
          </div>
          <span className="sk sk--btn" />
        </div>
        <div className="cvo-rings">
          {[0, 1, 2].map((i) => (
            <div key={i} className="cvo-ring2">
              <span className="sk cvo-sk-ring" />
              {line(70, true)}
            </div>
          ))}
        </div>
      </section>
      <div className="cvo-cols cvo-cols--opt" aria-hidden="true">
        <div className="cvo-col">
          {[0, 1].map((i) => (
            <section key={i} className="cvo-card cvo-panel">
              <div className="cvo-loading__lines">
                {line('35%')}
                {line('60%', true)}
              </div>
              <div className="cvo-loading__boxes">
                <span className="sk cvo-sk-box" />
                <span className="sk cvo-sk-box" />
              </div>
            </section>
          ))}
        </div>
        <div className="cvo-col">
          <section className="cvo-card cvo-panel">
            <div className="cvo-loading__lines">
              {line('30%')}
              {line('50%', true)}
              {line('45%')}
              {[90, 80, 95, 70, 85, 60].map((w, i) => (
                <span key={i} className="sk sk--line sk--thin" style={{ width: `${w}%` }} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
