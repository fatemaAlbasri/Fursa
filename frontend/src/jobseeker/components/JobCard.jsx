import { Link } from 'react-router-dom'
import {
  formatJobType,
  formatWorkMode,
  formatSalary,
  formatDeadline,
  daysLeft,
  daysLeftText
} from '../utils/jobFormat.js'
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

const fadeIn = (index) => ({ animationDelay: `${Math.min(index, 8) * 40}ms` })

export default function JobCard({ job, index }) {
  return (
    <article className="jfy-card" style={fadeIn(index)}>
      <div className="jfy-card__top">
        <CompanyLogo job={job} className="jfy-logo" />
        <div>
          <h3 className="jfy-card__title">{job.title}</h3>
          <p className="jfy-card__company">
            {job.company_name} · {job.location}
          </p>
        </div>
      </div>

      <JobTags job={job} withWorkMode />

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
        <h3 className="jfy-card__title">{job.title}</h3>
        <p className="jfy-card__company">
          {job.company_name} · {job.location} · {formatWorkMode(job.work_mode)} · {deadlineText(job)}
        </p>
        <div className="jfy-row__bottom">
          <JobTags job={job} />
          <span className="jfy-row__salary">{salaryText(job)}</span>
        </div>
      </div>

      <Link to={`/jobseeker/jobs/${job.id}`} className="btn btn--outline jfy-row__btn">
        View job
      </Link>
    </article>
  )
}
