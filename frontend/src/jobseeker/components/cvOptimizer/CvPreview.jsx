import { useMemo } from 'react'
import { CheckIcon, LockIcon } from '../../../shared/components/icons.jsx'
import { buildCvView } from '../../utils/cvText.js'
import { formatDay } from '../../utils/cvFormat.js'

// How a marked line looks, from the suggestions on it:
// all accepted → green; all dismissed → a plain line; otherwise amber (with a lock if it's in the Advanced report)
function markState(list) {
  if (list.every((s) => !s.locked && s.status === 'accepted')) return 'accepted'
  if (list.every((s) => !s.locked && s.status === 'dismissed')) return 'plain'
  return 'suggested'
}

// Right side of a marked line: "1 suggestion →" (opens it), "Locked" or "Accepted"
function MarkTag({ list, onJump }) {
  const open = list.filter((s) => !s.locked && s.status === 'pending')
  if (open.length) {
    return (
      <button type="button" className="cvo-mark__jump" onClick={() => onJump(open[0].id)}>
        {open.length} {open.length === 1 ? 'suggestion' : 'suggestions'} →
      </button>
    )
  }
  if (list.some((s) => s.locked)) {
    return (
      <span className="cvo-mark__tag">
        <LockIcon /> Locked
      </span>
    )
  }
  if (list.some((s) => s.status === 'accepted')) {
    return (
      <span className="cvo-mark__tag cvo-mark__tag--accepted">
        <CheckIcon /> Accepted
      </span>
    )
  }
  return null
}

// "Your CV": the CV text with the lines that have a suggestion marked, and the layout suggestion on top.
// action = optional button in the header (the optimizer page puts "Download PDF" there)
export default function CvPreview({ review, onJump, action }) {
  const view = useMemo(() => buildCvView(review.cvText, review.suggestions), [review.cvText, review.suggestions])
  const byId = useMemo(() => new Map(review.suggestions.map((s) => [s.id, s])), [review.suggestions])
  const layout = review.suggestions.find((s) => s.section === 'layout' && s.beforeText)

  return (
    <section className="cvo-card cvo-cv">
      <header className="cvo-cv__head">
        <div className="cvo-cv__titles">
          <h2 className="cvo-card__title">Your CV</h2>
          <span className="cvo-cv__file">
            {review.resume.fileName} · reviewed {formatDay(review.createdAt)}
          </span>
        </div>
        {action}
      </header>

      {view.name ? (
        <div className="cvo-cv__doc">
          <div className="cvo-cv__person">
            <p className="cvo-cv__name">{view.name}</p>
            {view.header.length > 0 && <p className="cvo-cv__contact">{view.header.join(' · ')}</p>}
          </div>

          {layout && markState([layout]) !== 'plain' && (
            <div className={`cvo-mark cvo-mark--${markState([layout])} cvo-mark--layout`}>
              <span className="cvo-mark__text">
                Section order: <strong>{layout.beforeText}</strong>
              </span>
              <MarkTag list={[layout]} onJump={onJump} />
            </div>
          )}

          {view.items.map((item, i) => {
            if (item.type === 'heading') {
              return (
                <h3 key={i} className="cvo-cv__heading">
                  {item.text}
                </h3>
              )
            }
            if (item.type === 'line') {
              return (
                <p key={i} className="cvo-cv__line">
                  {item.text}
                </p>
              )
            }
            const list = item.ids.map((id) => byId.get(id)).filter(Boolean)
            const state = markState(list)
            if (state === 'plain') {
              return item.lines.map((line, j) => (
                <p key={`${i}-${j}`} className="cvo-cv__line">
                  {line}
                </p>
              ))
            }
            return (
              <div key={i} className={`cvo-mark cvo-mark--${state}`}>
                <span className="cvo-mark__text">
                  {item.lines.map((line, j) => (
                    <span key={j} className="cvo-mark__line">
                      {line}
                    </span>
                  ))}
                </span>
                <MarkTag list={list} onJump={onJump} />
              </div>
            )
          })}
        </div>
      ) : (
        <p className="cvo-muted">We couldn't show the text of this CV.</p>
      )}

      <footer className="cvo-legend">
        <span className="cvo-legend__item">
          <span className="cvo-legend__swatch cvo-legend__swatch--suggested" /> Has a suggestion
        </span>
        <span className="cvo-legend__item">
          <span className="cvo-legend__swatch cvo-legend__swatch--accepted" /> Accepted
        </span>
        <span className="cvo-legend__item">
          <LockIcon /> In the Advanced report
        </span>
      </footer>
    </section>
  )
}
