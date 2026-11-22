import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api.js'
import { LockIcon } from '../../shared/components/icons.jsx'
import { formatDeadline } from '../../shared/utils/jobFormat.js'
import '../styles/HiringSummary.css'

// verdict.status → the pill at the top
const VERDICTS = {
  on_track: { label: 'On track', className: 'hs-pill--good' },
  needs_attention: { label: 'Needs attention', className: 'hs-pill--warn' },
  just_started: { label: 'Just started', className: 'hs-pill--muted' }
}

// days since posting → "Day 3", null → "–" (not reached yet)
const dayText = (days) => (days == null ? '–' : `Day ${days}`)

// Hiring summary for one job (Growth plan). Other plans see a locked card.
export default function HiringSummary({ jobId }) {
  const [data, setData] = useState(null)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/jobs/mine/${jobId}/summary`)
      .then(setData)
      .catch((err) => {
        if (err.upgrade) setLocked(true)
        else setError(err.error || 'Could not load the hiring summary.')
      })
  }, [jobId])

  // Not on the Growth plan
  if (locked) {
    return (
      <section className="hs-locked" aria-labelledby="hs-locked-title">
        <span className="hs-locked__icon" aria-hidden="true">
          <LockIcon />
        </span>
        <div className="hs-locked__text">
          <h2 id="hs-locked-title">
            Hiring summary <span className="hs-badge">Growth</span>
          </h2>
          <p>
            See conversion rates, how fast you're hiring and what's holding
            applicants back.
          </p>
        </div>
        <Link to="/company/plans" className="hs-locked__link">
          See plans →
        </Link>
      </section>
    )
  }

  if (error)
    return (
      <p className="field__error" role="alert">
        {error}
      </p>
    )

  if (!data) return null // loading: show nothing so the page doesn't jump

  const { verdict, funnel, speed, quality, tip, job } = data
  const pill = VERDICTS[verdict.status] || VERDICTS.just_started

  // bars are relative to the number who applied (at least 2% so a small bar is still visible)
  const steps = [
    ['Applied', funnel.applied],
    ['Shortlisted', funnel.shortlisted],
    ['Interview', funnel.interview],
    ['Hired', funnel.hired]
  ].map(([label, count]) => ({
    label,
    count,
    width: funnel.applied
      ? Math.max(2, Math.round((count / funnel.applied) * 100))
      : 0
  }))

  const timeline = [
    ['Posted', formatDeadline(job.created_at), true],
    [
      'First shortlist',
      dayText(speed.first_shortlist_days),
      speed.first_shortlist_days != null
    ],
    [
      'First interview',
      dayText(speed.first_interview_days),
      speed.first_interview_days != null
    ],
    ['Hired', dayText(speed.time_to_hire_days), speed.time_to_hire_days != null]
  ]

  return (
    <section className="hs" aria-labelledby="hs-title">
      <div className="hs-head">
        <h2 id="hs-title">Hiring summary</h2>
        <div className="hs-verdict">
          <span className={`hs-pill ${pill.className}`}>
            <span className="hs-pill__dot" aria-hidden="true" />
            {pill.label}
          </span>
          <span className="hs-verdict__text">{verdict.message}</span>
        </div>
      </div>

      <div className="hs-grid">
        <div className="hs-box">
          <h3>Where applicants drop off</h3>
          {steps.map((s) => (
            <div key={s.label} className="hs-bar">
              <span className="hs-bar__label">{s.label}</span>
              <span className="hs-bar__track">
                <span
                  className="hs-bar__fill"
                  style={{ width: `${s.width}%` }}
                />
              </span>
              <b className="hs-bar__count">{s.count}</b>
            </div>
          ))}
          {quality.average_score != null && (
            <p className="hs-note">
              Average match {quality.average_score}% · {quality.strong} strong{' '}
              {quality.strong === 1 ? 'match' : 'matches'}
            </p>
          )}
        </div>

        <div className="hs-box">
          <h3>How fast you're hiring</h3>
          <ol className="hs-timeline">
            {timeline.map(([label, when, reached], i) => (
              <li
                key={label}
                className={
                  i < timeline.length - 1 ? 'hs-step hs-step--line' : 'hs-step'
                }
              >
                <span
                  className={reached ? 'hs-dot hs-dot--on' : 'hs-dot'}
                  aria-hidden="true"
                />
                <span className="hs-step__row">
                  <span>{label}</span>
                  <b>{when}</b>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {tip && (
        <p className="hs-tip">
          <b>What's holding applicants back:</b> {tip.name} is missing for{' '}
          {tip.count} of {tip.of} applicants, more than any other must-have.
          Making it optional would widen your pool.
        </p>
      )}
    </section>
  )
}
