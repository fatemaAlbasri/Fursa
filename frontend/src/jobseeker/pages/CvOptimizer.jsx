import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api.js'
import {
  REVIEW,
  REPORT_PRICE_BHD,
  SECTION_LABELS,
  CV_SECTIONS,
  loadProgress,
  saveProgress,
  currentScore,
  downloadUpdatedCv
} from '../data/cvOptimizer.js'
import { formatDeadline } from '../utils/jobFormat.js'
import ScoreRing from '../components/ScoreRing.jsx'
import CvSuggestion from '../components/CvSuggestion.jsx'
import '../styles/CvOptimizer.css'

// AI CV Optimizer (free plan): the CV on the left, the score + 1 free suggestion on the right,
// the other suggestions locked until the Advanced CV report is unlocked (its own page).
const REPORT_PATH = '/jobseeker/cv-optimizer/report'

const suggestionFor = (section) => REVIEW.suggestions.find((s) => s.section === section)
const freeSuggestions = REVIEW.suggestions.filter((s) => s.is_free_preview)
const lockedSuggestions = REVIEW.suggestions.filter((s) => !s.is_free_preview)

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

export default function CvOptimizer() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(loadProgress)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [resume, setResume] = useState(null) // file name + upload date of the current CV

  // Not signed in → Sign In. The CV file details are only shown if they load.
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/signin?role=jobseeker', { replace: true })
      return
    }
    let ignore = false // stops a late answer from updating the page after leaving it
    api('/cv')
      .then((data) => {
        if (!ignore) setResume(data.resume)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [navigate])

  const update = (next) => {
    setProgress(next)
    saveProgress(next)
  }
  const setStatus = (section, status) =>
    update({ ...progress, statuses: { ...progress.statuses, [section]: status } })

  // Simulated payment: no card details, just marks the report as unlocked and opens it
  const unlock = () => {
    update({ ...progress, unlocked: true, paidAt: new Date().toISOString() })
    navigate(REPORT_PATH)
  }

  const { statuses, unlocked } = progress
  const score = currentScore(statuses)

  return (
    <main className="container cvo">
      <header className="cvo-head">
        <div className="cvo-head__title">
          <span className="cvo-head__icon">
            <SparkleIcon />
          </span>
          <div>
            <h1 className="title">AI CV Optimizer</h1>
            <p className="muted">Rewords what you already wrote. Never adds skills or experience you don't have.</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          aria-pressed={!showSuggestions}
          onClick={() => setShowSuggestions(!showSuggestions)}
        >
          {showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
        </button>
      </header>

      <div className="cvo-grid">
        {/* ---------- Left: the CV ---------- */}
        <section className="card cvo-cv" aria-label="Your CV">
          <div className="cvo-cv__head">
            <h2 className="section-title">Your CV</h2>
            {resume && (
              <span className="cvo-cv__file">
                {resume.file_name} · uploaded {formatDeadline(resume.uploaded_at)}
              </span>
            )}
          </div>

          {/* name + contact line (not reviewed, shown as grey placeholders) */}
          <div className="cvo-lines" aria-hidden="true">
            <span className="cvo-line cvo-line--name" />
            <span className="cvo-line cvo-line--70" />
          </div>

          {CV_SECTIONS.map((section) => {
            const s = suggestionFor(section)
            const status = statuses[section] || 'pending'
            // Education has no free text in the preview; the wireframe shows it as placeholders
            const showText = section !== 'education'
            return (
              <div key={section} className="cvo-cv__section">
                <h3 className="cvo-cv__label">{SECTION_LABELS[section]}</h3>
                {showText && (
                  <p
                    className={
                      status === 'accepted'
                        ? 'cvo-cv__text cvo-cv__text--accepted'
                        : showSuggestions && status === 'pending'
                          ? 'cvo-cv__text cvo-cv__text--marked'
                          : 'cvo-cv__text'
                    }
                  >
                    {status === 'accepted' ? s.after_text : s.before_text}
                  </p>
                )}
                {(section === 'projects' || section === 'education') && (
                  <div className="cvo-lines" aria-hidden="true">
                    <span className="cvo-line cvo-line--90" />
                    <span className="cvo-line cvo-line--80" />
                  </div>
                )}
              </div>
            )
          })}

          {showSuggestions && <p className="cvo-cv__hint">Highlighted parts have suggestions →</p>}
        </section>

        {/* ---------- Right: score, suggestions, unlock ---------- */}
        <div className="cvo-side">
          <section className="cvo-score" aria-label="CV strength">
            <ScoreRing score={score} />
            <div className="cvo-score__text">
              <h2>CV strength {score} / 100</h2>
              <p>
                We found {REVIEW.suggestions.length} improvements · {freeSuggestions.length} shown free
              </p>
            </div>
            <span className="cvo-score__plan">{unlocked ? 'Report unlocked' : 'Free plan'}</span>
          </section>

          {showSuggestions && (
            <>
              {freeSuggestions.map((s) => (
                <CvSuggestion
                  key={s.section}
                  suggestion={s}
                  status={statuses[s.section]}
                  onAccept={(section) => setStatus(section, 'accepted')}
                  onDismiss={(section) => setStatus(section, 'dismissed')}
                />
              ))}

              {!unlocked && (
                <section className="card cvo-more">
                  <h2 className="section-title">{lockedSuggestions.length} more improvements found</h2>
                  <ul className="cvo-more__list">
                    {lockedSuggestions.map((s) => (
                      <CvSuggestion key={s.section} suggestion={s} locked />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          <section className="cvo-unlock">
            <div className="cvo-unlock__text">
              <h2>
                <LockIcon />
                Advanced CV report
              </h2>
              <p>
                {unlocked
                  ? `Unlocked. See all ${REVIEW.suggestions.length} improvements and how your CV compares with strong CVs in your field.`
                  : `See all ${REVIEW.suggestions.length} improvements, a full section-by-section rewrite, and how your CV compares with strong CVs in your field.`}
              </p>
            </div>
            {unlocked ? (
              <Link to={REPORT_PATH} className="btn cvo-unlock__btn">
                View report
              </Link>
            ) : (
              <button type="button" className="btn cvo-unlock__btn" onClick={unlock}>
                Unlock for BHD {REPORT_PRICE_BHD}
              </button>
            )}
          </section>

          <button type="button" className="btn btn--outline btn--block" onClick={() => downloadUpdatedCv(statuses)}>
            Download updated CV
          </button>
        </div>
      </div>
    </main>
  )
}
