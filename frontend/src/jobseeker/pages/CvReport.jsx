import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  REVIEW,
  REPORT_PRICE_BHD,
  SECTION_LABELS,
  loadProgress,
  saveProgress,
  currentScore,
  pointsText,
  downloadText,
  downloadUpdatedCv
} from '../data/cvOptimizer.js'
import ScoreRing from '../components/ScoreRing.jsx'
import CvSuggestion from '../components/CvSuggestion.jsx'
import '../styles/CvReport.css'

// Advanced CV report: opened after "Unlock" on the AI CV Optimizer page (simulated payment).
// Shows every suggestion, the score now → after all changes, and the comparison with strong CVs.
const OPTIMIZER_PATH = '/jobseeker/cv-optimizer'

// paidAt (ISO) → "12 Oct 2026"
const formatPaidDate = (iso) => {
  const date = new Date(iso)
  return isNaN(date) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// The whole report as plain text for "Download full report"
function reportText(statuses) {
  const lines = [
    'Fursa - Advanced CV report',
    `CV strength: ${currentScore(statuses)} / 100 now, ${REVIEW.potential_score} / 100 after all changes`,
    '',
    'SECTION-BY-SECTION REWRITE'
  ]
  REVIEW.suggestions.forEach((s) => {
    lines.push(
      '',
      `${SECTION_LABELS[s.section].toUpperCase()} (${pointsText(s.points)})${statuses[s.section] ? ` - ${statuses[s.section]}` : ''}`,
      `Before: ${s.before_text}`,
      `After: ${s.after_text}`,
      `Why: ${s.reason}`
    )
  })
  lines.push('', 'HOW YOUR CV COMPARES WITH STRONG IT CVS')
  REVIEW.comparison.forEach((c) => lines.push(`${c.ok ? '[x]' : '[!]'} ${c.label}`))
  return lines.join('\n') + '\n'
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export default function CvReport() {
  const [progress, setProgress] = useState(loadProgress)

  // Not signed in → Sign In; report not unlocked yet → back to the free page
  if (!localStorage.getItem('token')) return <Navigate to="/signin?role=jobseeker" replace />
  if (!progress.unlocked) return <Navigate to={OPTIMIZER_PATH} replace />

  const { statuses } = progress
  const setStatus = (section, status) => {
    const next = { ...progress, statuses: { ...statuses, [section]: status } }
    setProgress(next)
    saveProgress(next)
  }

  return (
    <main className="container cvr">
      <Link to={OPTIMIZER_PATH} className="cvr-back">
        ← Back to AI CV Optimizer
      </Link>

      <div className="cvr-paid" role="status">
        <span className="cvr-paid__text">
          <CheckIcon />
          Advanced report unlocked · BHD {REPORT_PRICE_BHD} paid (simulated)
        </span>
        <span className="cvr-paid__date">{formatPaidDate(progress.paidAt)}</span>
      </div>

      <section className="cvr-hero">
        <div className="cvr-hero__text">
          <h1>Your advanced CV report</h1>
          <p>
            All {REVIEW.suggestions.length} improvements, rewritten section by section. Every suggestion uses only
            what is already in your CV.
          </p>
        </div>
        <div className="cvr-hero__scores">
          <ScoreRing score={currentScore(statuses)} label="Now" />
          <span className="cvr-hero__arrow" aria-hidden="true">
            →
          </span>
          <ScoreRing score={REVIEW.potential_score} label="After changes" tone="accent" />
        </div>
      </section>

      <section className="cvr-rewrite" aria-labelledby="cvr-rewrite-title">
        <h2 id="cvr-rewrite-title" className="cvr-heading">
          Section-by-section rewrite
        </h2>
        {REVIEW.suggestions.map((s) => (
          <CvSuggestion
            key={s.section}
            suggestion={s}
            status={statuses[s.section]}
            onAccept={(section) => setStatus(section, 'accepted')}
            onDismiss={(section) => setStatus(section, 'dismissed')}
          />
        ))}
      </section>

      <section className="card cvr-compare">
        <h2 className="cvr-heading">How your CV compares with strong IT CVs</h2>
        <p className="muted small">What strong entry-level CVs in your field usually include, and whether yours does.</p>
        <ul className="cvr-compare__list">
          {REVIEW.comparison.map((c) => (
            <li key={c.label} className={c.ok ? 'cvr-check cvr-check--ok' : 'cvr-check cvr-check--todo'}>
              <span className="cvr-check__mark" aria-hidden="true">
                {c.ok ? '✓' : '!'}
              </span>
              <span>
                {c.label}
                <span className="cvr-sr-only">{c.ok ? ' (your CV has this)' : ' (missing from your CV)'}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="cvr-actions">
        <button type="button" className="btn btn--primary" onClick={() => downloadUpdatedCv(statuses)}>
          Download improved CV
        </button>
        <button
          type="button"
          className="btn btn--outline"
          onClick={() => downloadText('advanced_cv_report.txt', reportText(statuses))}
        >
          Download full report
        </button>
      </div>
    </main>
  )
}
