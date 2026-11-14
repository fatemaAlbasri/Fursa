// Round match-score ring (e.g. 92%). score = null → empty ring with "–"
// size = width in px (the ring scales with it) · className = the page's own style
// Used by: Applicants dashboard (50px), Applicant page (76px)
export default function ScoreRing({ score, size = 50, className = 'ap-score' }) {
  const CIRCLE = 125.66; // length of the circle's edge (2 × π × 20)
  const filled = ((score ?? 0) / 100) * CIRCLE;
  return (
    <div className={className} role="img" aria-label={score == null ? 'Not ranked yet' : `${score}% match`}>
      <svg width={size} height={size} viewBox="0 0 50 50" aria-hidden="true">
        <circle cx="25" cy="25" r="20" fill="none" stroke="#DDF1F1" strokeWidth="5" />
        {score != null && (
          <circle cx="25" cy="25" r="20" fill="none" stroke="#159A9C" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${filled.toFixed(1)} ${CIRCLE}`} transform="rotate(-90 25 25)" />
        )}
      </svg>
      <span>{score == null ? '–' : `${score}%`}</span>
    </div>
  );
}
