import { Link } from 'react-router-dom'
import { formatJobType, formatWorkMode, formatDeadline } from '../../shared/utils/jobFormat.js'
import CompanyLogo from './CompanyLogo.jsx'

// One job as a wide row, two kinds:
//   JobMatchRow = Jobs for you (Top 10): tags + why it matches, ring + "View & apply"
//   JobRow      = All jobs: Top 10 / Applied badges, what's missing, ring + "View job"
// index staggers the fade-in a little, job by job.

const fadeIn = (index) => ({ animationDelay: `${Math.min(index, 8) * 40}ms` })

// The signed-in seeker's match for this job (match_score from GET /api/jobs).
// null = not scored yet → no ring; 0 is a real score and is shown.
// muted = pale red ring for jobs the seeker doesn't qualify for.
// The coloured part fills up when the row appears (circle length 2πr = 157.08 for r = 25).
function MatchRing({ score, muted }) {
  if (score == null) return null
  return (
    <div
      className={muted ? 'jfy-ring jfy-ring--muted' : 'jfy-ring'}
      role="img"
      aria-label={`${score}% match`}
      title={`${score}% match`}
    >
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <circle className="jfy-ring__track" cx="30" cy="30" r="25" />
        <circle
          className="jfy-ring__bar"
          cx="30"
          cy="30"
          r="25"
          style={{ strokeDasharray: `${(score * 1.5708).toFixed(1)} 157.08` }}
        />
      </svg>
      <span className="jfy-ring__value">{score}%</span>
    </div>
  )
}

const TypeTag = ({ job }) => (
  <span className={job.job_type === 'internship' ? 'jfy-tag jfy-tag--internship' : 'jfy-tag'}>
    {formatJobType(job.job_type)}
  </span>
)

const CompanyLink = ({ job }) => (
  <Link to={`/jobseeker/companies/${job.company_id}`} className="jfy-match__company">
    {job.company_name}
  </Link>
)

// Top 10: why it matches, e.g. "Matches 2 of 3 skills · Missing: CSS"
function MatchWhy({ job }) {
  if (job.match_score == null) return null
  const missing = job.missing_skills || []
  const missingMust = job.missing_required || []
  if (missingMust.length) {
    return <span className="jfy-why jfy-why--bad">Missing must-have: {missingMust.join(', ')}</span>
  }
  if (!job.skills_total) return null
  const have = job.skills_total - missing.length
  return (
    <span className="jfy-why">
      Matches {have} of {job.skills_total} skills
      {missing.length > 0 && ` · Missing: ${missing.join(', ')}`}
    </span>
  )
}

// All jobs: green = has every skill, amber = missing a nice-to-have, red = missing a must-have
function MatchNote({ job }) {
  if (job.match_score == null) return null
  const missing = job.missing_skills || []
  const missingMust = job.missing_required || []
  if (missingMust.length) {
    return <span className="jfy-note jfy-note--bad">Missing must-have: {missingMust.join(', ')}</span>
  }
  if (missing.length) {
    return <span className="jfy-note jfy-note--warn">Missing: {missing.join(', ')} (nice to have)</span>
  }
  if (job.skills_total) {
    return (
      <span className="jfy-note jfy-note--good">
        Matches {job.skills_total} of {job.skills_total} skills
      </span>
    )
  }
  return null
}

// ★ Top 10 and ✓ Applied
function Badges({ job }) {
  if (!job.top && !job.applied) return null
  return (
    <span className="jfy-badges">
      {job.top && <span className="jfy-badge jfy-badge--top">★ Top 10</span>}
      {job.applied && <span className="jfy-badge jfy-badge--applied">✓ Applied</span>}
    </span>
  )
}

export function JobRow({ job, index }) {
  const notQualified = job.match_score != null && job.is_qualified === false
  return (
    <article className="jfy-match jfy-match--row" style={fadeIn(index)}>
      <CompanyLogo job={job} className="jfy-logo" />
      <div className="jfy-match__info">
        <div className="jfy-row__title">
          <h3 className="jfy-card__title">{job.title}</h3>
          <Badges job={job} />
        </div>
        <p className="jfy-card__company">
          <CompanyLink job={job} /> · {job.location} · {formatWorkMode(job.work_mode)} · Deadline{' '}
          {formatDeadline(job.deadline)}
        </p>
        <div className="jfy-tags">
          <TypeTag job={job} />
          <MatchNote job={job} />
        </div>
      </div>
      <div className="jfy-match__end">
        <MatchRing score={job.match_score} muted={notQualified} />
        <Link to={`/jobseeker/jobs/${job.id}`} className="btn btn--outline jfy-row__btn">
          View job
        </Link>
      </div>
    </article>
  )
}

export function JobMatchRow({ job, index }) {
  return (
    <article className="jfy-match" style={fadeIn(index)}>
      <CompanyLogo job={job} className="jfy-logo jfy-match__logo" />
      <div className="jfy-match__info">
        <div>
          <h3 className="jfy-card__title">{job.title}</h3>
          <p className="jfy-card__company">
            <CompanyLink job={job} /> · {job.location} · Deadline {formatDeadline(job.deadline)}
          </p>
        </div>
        <div className="jfy-tags">
          <TypeTag job={job} />
          <span className="jfy-tag jfy-tag--mode">{formatWorkMode(job.work_mode)}</span>
          <MatchWhy job={job} />
        </div>
      </div>
      <div className="jfy-match__end">
        <MatchRing score={job.match_score} />
        <Link to={`/jobseeker/jobs/${job.id}`} className="btn btn--primary jfy-match__btn">
          View &amp; apply
        </Link>
      </div>
    </article>
  )
}

// Grey placeholder rows in the same shape, while the jobs load (wireframe 23 · Loading a list)
export function JobMatchRowsLoading({ count = 4 }) {
  return (
    <div className="jfy-match-list" role="status" aria-label="Loading jobs">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="jfy-match jfy-match--loading" aria-hidden="true">
          <span className="sk jfy-match__logo" />
          <div className="jfy-match__info">
            <span className="sk sk--line" style={{ width: '55%' }} />
            <span className="sk sk--line sk--thin" style={{ width: '40%' }} />
            <div className="jfy-tags">
              <span className="sk sk--pill" />
              <span className="sk sk--pill" />
              <span className="sk sk--line sk--thin" style={{ width: '30%' }} />
            </div>
          </div>
          <div className="jfy-match__end">
            <span className="sk sk--ring" />
            <span className="sk sk--btn" />
          </div>
        </div>
      ))}
    </div>
  )
}
