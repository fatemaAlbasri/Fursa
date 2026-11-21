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

// Job type tag (purple for internships) + field tag
function JobTags({ job, withWorkMode }) {
  return (
    <div className="jfy-tags">
      <span className={job.job_type === 'internship' ? 'jfy-tag jfy-tag--internship' : 'jfy-tag'}>
        {formatJobType(job.job_type)}
      </span>
      {withWorkMode && <span className="jfy-tag jfy-tag--plain">{formatWorkMode(job.work_mode)}</span>}
      {job.field && <span className="jfy-tag jfy-tag--plain">{job.field}</span>}
    </div>
  )
}

// The signed-in seeker's match for this job (match_score from GET /api/jobs).
// null = not scored yet → no ring; 0 is a real score and is shown.
function MatchRing({ score, qualified }) {
  if (score == null) return null
  return (
    <div
      className={qualified === false ? 'jfy-ring jfy-ring--low' : 'jfy-ring'}
      style={{ '--score': score }}
      aria-label={`${score}% match`}
      title={`${score}% match`}
    >
      <span className="jfy-ring__value">{score}%</span>
    </div>
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

export default function JobCard({ job, index }) {
  return (
    <article className="jfy-card" style={fadeIn(index)}>
      <div className="jfy-card__top">
        <CompanyLogo job={job} className="jfy-logo" />
        <div className="jfy-card__heading">
          <h3 className="jfy-card__title">{job.title}</h3>
          <Badges job={job} />
          <p className="jfy-card__company">
            {job.company_name} · {job.location}
          </p>
        </div>
        <MatchRing score={job.match_score} />
      </div>

      <JobTags job={job} withWorkMode />
      <MatchNote job={job} />

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
