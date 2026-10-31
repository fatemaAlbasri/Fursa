// Round CV score (e.g. 72) used by the AI CV Optimizer page and the Advanced CV report.
// Made for the dark navy boxes in the wireframe. The score itself is worked out by the page
// (currentScore() / REVIEW in data/cvOptimizer.js) and passed in.
//
//   <ScoreRing score={72} />                                   page 1, "CV strength"
//   <ScoreRing score={72} label="Now" />                       report, before
//   <ScoreRing score={88} label="After changes" tone="accent" /> report, after
//
// Size: `size` px by default; a page can change it per screen size by setting
// --score-ring-size on a parent in its CSS (e.g. smaller on mobile).
// Styled here because it is one small piece (brand colours from index.css).

const RADIUS = 42 // inside a 100 × 100 viewBox, leaving room for the stroke
const STROKE = 9
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const wrap = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  margin: 0,
  flexShrink: 0
}
const caption = {
  fontSize: 12,
  color: 'var(--gray)'
}

export default function ScoreRing({ score, label, tone = 'light', size = 64 }) {
  // Keep the arc inside 0–100 even if a bad value comes in
  const value = Math.min(100, Math.max(0, Math.round(Number(score) || 0)))
  const offset = CIRCUMFERENCE * (1 - value / 100)

  return (
    <figure style={wrap}>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${label ? `${label}: ` : ''}CV strength ${value} out of 100`}
        style={{ width: `var(--score-ring-size, ${size}px)`, height: 'auto', display: 'block' }}
      >
        {/* faint full circle behind the score */}
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--accent)" strokeOpacity="0.25" strokeWidth={STROKE} />
        {/* the score: starts at the top and goes clockwise; animates when the score changes */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="32"
          fontWeight="800"
          fill={tone === 'accent' ? 'var(--accent)' : 'var(--white)'}
        >
          {value}
        </text>
      </svg>
      {label && <figcaption style={caption}>{label}</figcaption>}
    </figure>
  )
}
