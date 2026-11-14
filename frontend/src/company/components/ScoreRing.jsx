import { useEffect, useState } from 'react'

export default function ScoreRing({
  score,
  size = 50,
  className = 'ap-score',
  byScore = false,
  thickness = 5
}) {
  const [shown, setShown] = useState(score ?? 0)
  useEffect(() => {
    if (
      score == null ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return setShown(score ?? 0)
    let frame
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / 1000, 1)
      setShown(Math.round(score * (1 - (1 - t) ** 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [score])

  const CIRCLE = 125.66
  const filled = ((score ?? 0) / 100) * CIRCLE
  const [ring, text] =
    !byScore || score == null
      ? ['#159A9C', undefined]
      : score < 50
        ? ['#D92D20', '#B42318']
        : score < 75
          ? ['#F79009', '#B54708']
          : ['#12B76A', '#067647']
  return (
    <div
      className={className}
      role="img"
      aria-label={score == null ? 'Not ranked yet' : `${score}% match`}
    >
      <svg width={size} height={size} viewBox="0 0 50 50" aria-hidden="true">
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="#DDF1F1"
          strokeWidth={thickness}
        />
        {score != null && (
          <circle
            className="score-ring__fill"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke={ring}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={CIRCLE}
            strokeDashoffset={(CIRCLE - filled).toFixed(1)}
            transform="rotate(-90 25 25)"
          />
        )}
      </svg>
      <span style={{ color: text }}>{score == null ? '–' : `${shown}%`}</span>
    </div>
  )
}
