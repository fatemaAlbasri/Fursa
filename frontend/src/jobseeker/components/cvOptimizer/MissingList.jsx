import { useState } from 'react'
import { pointsLabel } from '../../utils/cvFormat.js'

// Ticks are only kept in this browser, per review. Only short codes made from each item are stored,
// never the CV or the advice text itself.
const storageKey = (reviewId) => `cvo-checked-${reviewId}`

function itemCode(item) {
  let hash = 5381
  for (const char of `${item.section}|${item.advice}`) hash = ((hash << 5) + hash + char.charCodeAt(0)) | 0
  return (hash >>> 0).toString(36)
}

function readChecked(reviewId) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(reviewId)) || '[]')
    return new Set(Array.isArray(saved) ? saved : [])
  } catch {
    return new Set()
  }
}

// "What only you can add": what the CV is still missing, from review.missing.
// variant "grid" (optimizer page, 3 columns) or "list" (Advanced report, 1 column).
// Give it key={review.id} so a new review starts with its own ticks.
export default function MissingList({ reviewId, items, variant = 'grid' }) {
  const [checked, setChecked] = useState(() => readChecked(reviewId))

  function toggle(code) {
    const next = new Set(checked)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    setChecked(next)
    try {
      localStorage.setItem(storageKey(reviewId), JSON.stringify([...next]))
    } catch {
      // storage blocked (private window): the ticks just aren't remembered
    }
  }

  return (
    <ul className={`cvo-missing cvo-missing--${variant}`}>
      {items.map((item, i) => {
        const code = itemCode(item)
        const isChecked = checked.has(code)
        return (
          <li key={`${code}-${i}`}>
            <label className={isChecked ? 'cvo-todo cvo-todo--done' : 'cvo-todo'}>
              <input type="checkbox" className="cvo-todo__box" checked={isChecked} onChange={() => toggle(code)} />
              <span className="cvo-todo__body">
                <span className="cvo-todo__tags">
                  <span className="cvo-chip cvo-chip--grey">{item.section}</span>
                  {item.points > 0 && <span className="cvo-points">up to {pointsLabel(item.points)}</span>}
                </span>
                <span className="cvo-todo__text">{item.advice}</span>
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
