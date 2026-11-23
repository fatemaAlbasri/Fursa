import { Link } from 'react-router-dom'
import {
  formatJobType,
  formatWorkMode,
  formatSalary,
  formatDeadline,
  daysLeft,
  daysLeftText
} from '../../shared/utils/jobFormat.js'
import CompanyLogo from './CompanyLogo.jsx'
import { PinIcon } from '../../shared/components/icons.jsx'

// One job, shown two ways with the same information:
//   JobCard = box in the grid (Jobs for you, All jobs → Grid view)
//   JobRow  = one wide row   (All jobs → List view)
// index staggers the fade-in a little, job by job.

const salaryText = (job) => {
  const salary = formatSalary(job.salary)
  return salary ? `${salary} / month` : 'Salary not shown'
}

const deadlineText = (job) => {
  const left = daysLeftText(daysLeft(job.deadline))
  return `Deadline ${formatDeadline(job.deadline)}${left ? ` · ${left}` : ''}`
}

// Job type tag (purple for internships) + field tag (list rows)
function JobTags({ job }) {
  return (
    <div className="jfy-tags">
      <span className={job.job_type === 'internship' ? 'jfy-tag jfy-tag--internship' : 'jfy-tag'}>
        {formatJobType(job.job_type)}
      </span>
      {job.field && <span className="jfy-tag jfy-tag--plain">{job.field}</span>}
    </div>
  )
}

// The signed-in seeker's match for this job (match_score from GET /api/jobs).
// null = not scored yet → no ring; 0 is a real score and is shown.
// The teal part fills up when the card appears (circle length 2πr = 157.08 for r = 25).
function MatchRing({ score }) {
  if (score == null) return null
  return (
    <div className="jfy-ring" role="img" aria-label={`${score}% match`} title={`${score}% match`}>
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

// one line in the card: why it matches, e.g. "Matches 2 of 3 skills · Missing: CSS"
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

// the line under the job: what the seeker has or is missing
function MatchNote({ job }) {
  if (job.match_score == null) return null
  const missing = job.missing_skills || []
  const missingMust = job.missing_required || []

  if (missingMust.length) {
    return <p className="jfy-note jfy-note--bad">Missing must-have: {missingMust.join(', ')}</p>
  }
  if (missing.length) {
    return <p className="jfy-note jfy-note--warn">Missing: {missing.join(', ')}</p>
  }
  if (job.skills_total) {
    return <p className="jfy-note jfy-note--good">Matches all {job.skills_total} skills</p>
  }
  return null
}

// Top 10 and  Applied
function Badges({ job }) {
  if (!job.top && !job.applied) return null
  return (
    <span className="jfy-badges">
      {job.top && <span className="jfy-badge jfy-badge--top">★ Top 10</span>}
      {job.applied && <span className="jfy-badge jfy-badge--applied">✓ Applied</span>}
    </span>
  )
}

const fadeIn = (index) => ({ animationDelay: `${Math.min(index, 8) * 40}ms` })

// hideTop = don't show the "Top 10" badge (the Top 10 list itself)
export default function JobCard({ job, index, hideTop }) {
  return (
    <article className="jfy-card" style={fadeIn(index)}>
      <div className="jfy-card__top">
        <CompanyLogo job={job} className="jfy-logo" />
        <div className="jfy-card__heading">
          <h3 className="jfy-card__title">{job.title}</h3>
          <Badges job={hideTop ? { ...job, top: false } : job} />
          <p className="jfy-card__company">
            {job.company_name} · {job.location}
          </p>
        </div>
        <MatchRing score={job.match_score} />
      </div>

      {/* job type, work mode, then why it matches, all on one line like the wireframe */}
      <div className="jfy-tags">
        <span className={job.job_type === 'internship' ? 'jfy-tag jfy-tag--internship' : 'jfy-tag'}>
          {formatJobType(job.job_type)}
        </span>
        <span className="jfy-tag jfy-tag--mode">
          <PinIcon />
          {formatWorkMode(job.work_mode)}
        </span>
        <MatchWhy job={job} />
      </div>

      <p className="jfy-card__meta">
        <span>{salaryText(job)}</span>
        <span>{deadlineText(job)}</span>
      </p>

      <Link to={`/jobseeker/jobs/${job.id}`} className="btn btn--primary btn--block">
        View &amp; apply
      </Link>
    </article>
  )
}

export function JobRow({ job, index }) {
  return (
    <article className="jfy-row" style={fadeIn(index)}>
      <CompanyLogo job={job} className="jfy-logo" />

      <div className="jfy-row__info">
        <div className="jfy-row__title">
          <h3 className="jfy-card__title">{job.title}</h3>
          <Badges job={job} />
        </div>
        <p className="jfy-card__company">
          {job.company_name} · {job.location} · {formatWorkMode(job.work_mode)} · {deadlineText(job)}
        </p>
        <div className="jfy-row__bottom">
          <JobTags job={job} />
          <span className="jfy-row__salary">{salaryText(job)}</span>
        </div>
        <MatchNote job={job} />
      </div>

      <MatchRing score={job.match_score} />

      <Link to={`/jobseeker/jobs/${job.id}`} className="btn btn--outline jfy-row__btn">
        View job
      </Link>
    </article>
  )
}
