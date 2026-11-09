import { scoreTone } from '../../utils/cvFormat.js'

// Round score out of 100 for the navy score panel. The colour follows the score band.
export default function ScoreRing({ score }) {
  return (
    <div
      className={`cvo-ring cvo-tone--${scoreTone(score)}`}
      style={{ '--score': score }}
      role="img"
      aria-label={`CV strength ${score} out of 100`}
    >
      <span className="cvo-ring__inner">
        <span className="cvo-ring__value">{score}</span>
        <span className="cvo-ring__max">/ 100</span>
      </span>
    </div>
  )
}
