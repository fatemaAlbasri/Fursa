import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Notice from '../../shared/components/Notice.jsx'
import { CheckIcon, LockIcon, SparkleIcon, UploadIcon } from '../../shared/components/icons.jsx'
import useCvReview from '../utils/useCvReview.js'
import { formatBhd, formatDay, scoreTone, REPORT_PATH } from '../utils/cvFormat.js'
import { PageHead, ErrorState } from '../components/cvOptimizer/PageParts.jsx'
import CvPreview from '../components/cvOptimizer/CvPreview.jsx'
import SuggestionCard from '../components/cvOptimizer/SuggestionCard.jsx'
import MissingList from '../components/cvOptimizer/MissingList.jsx'
import DownloadButton from '../components/cvOptimizer/DownloadButton.jsx'
import UploadButton from '../components/cvOptimizer/UploadButton.jsx'
import UnlockDialog from '../components/cvOptimizer/UnlockDialog.jsx'
import '../styles/CvOptimizer.css'

// AI CV Optimizer (wireframe 8): CV strength, the free suggestion, the locked Advanced report,
// what only the seeker can add, and the CV itself on the right.

const MISSING_SHOWN = 4 // "Show all N tips" opens the rest

// Score out of 100 in a ring: red under 50, amber under 75, green from 75 (scoreTone).
// faded = a score you could reach, not the one you have now. Circle length 2πr = 301.6 for r = 48.
function StrengthRing({ score, label, sub, faded }) {
  return (
    <div className="cvo-ring2">
      <div className={`cvo-ring2__circle cvo-ring2--${scoreTone(score)}${faded ? ' cvo-ring2--faded' : ''}`}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="cvo-ring2__track" cx="60" cy="60" r="48" />
          <circle
            className="cvo-ring2__bar"
            cx="60"
            cy="60"
            r="48"
            style={{ strokeDasharray: `${((score / 100) * 301.6).toFixed(1)} 301.6` }}
          />
        </svg>
        <span className="cvo-ring2__value">{score}</span>
      </div>
      <span className="cvo-ring2__label">
        {label}
        {sub && <span className="cvo-ring2__sub">{sub}</span>}
      </span>
    </div>
  )
}

const Arrow = () => (
  <svg className="cvo-ring2__arrow" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

// Card with a title + a grey line under it, split from the content by a thin line
function Panel({ title, sub, action, className = '', children, ...rest }) {
  return (
    <section className={`cvo-card cvo-panel ${className}`} {...rest}>
      <div className="cvo-panel__head">
        <div>
          <h2 className="cvo-card__title">{title}</h2>
          {sub && <p className="cvo-panel__sub">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

// While the review loads: grey shapes in the same layout (wireframe 23)
function OptimizerLoading() {
  const line = (width, thin) => <span className={thin ? 'sk sk--line sk--thin' : 'sk sk--line'} style={{ width }} />
  return (
    <div className="cvo-loading" role="status" aria-label="Loading your CV review">
      <section className="cvo-card cvo-panel" aria-hidden="true">
        <div className="cvo-panel__head">
          <div className="cvo-loading__lines">
            {line(160)}
            {line(220, true)}
          </div>
          <span className="sk sk--btn" />
        </div>
        <div className="cvo-rings">
          {[0, 1, 2].map((i) => (
            <div key={i} className="cvo-ring2">
              <span className="sk cvo-sk-ring" />
              {line(70, true)}
            </div>
          ))}
        </div>
      </section>
      <div className="cvo-cols cvo-cols--opt" aria-hidden="true">
        <div className="cvo-col">
          {[0, 1].map((i) => (
            <section key={i} className="cvo-card cvo-panel">
              <div className="cvo-loading__lines">
                {line('35%')}
                {line('60%', true)}
              </div>
              <div className="cvo-loading__boxes">
                <span className="sk cvo-sk-box" />
                <span className="sk cvo-sk-box" />
              </div>
            </section>
          ))}
        </div>
        <div className="cvo-col">
          <section className="cvo-card cvo-panel">
            <div className="cvo-loading__lines">
              {line('30%')}
              {line('50%', true)}
              {line('45%')}
              {[90, 80, 95, 70, 85, 60].map((w, i) => (
                <span key={i} className="sk sk--line sk--thin" style={{ width: `${w}%` }} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// "AI is working" (wireframe 23): steps tick off while the review runs
const AI_STEPS = ['Reading your CV', 'Checking your skills and wording', 'Writing suggestions']

function Analysing({ fileName }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    // the backend doesn't report progress, so the steps move on by time (the last one waits)
    const timers = [setTimeout(() => setStep(1), 2500), setTimeout(() => setStep(2), 9000)]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <section className="cvo-card cvo-ai" role="status" aria-live="polite">
      <div className="cvo-ai__head">
        <span className="cvo-ai__icon" aria-hidden="true">
          <SparkleIcon />
        </span>
        <div>
          <h2 className="cvo-card__title">Reviewing your CV…</h2>
          <p className="cvo-panel__sub">
            {fileName ? `${fileName} · ` : ''}This usually takes under a minute. Please keep this page open.
          </p>
        </div>
      </div>
      <div className="cvo-ai__bar">
        <span />
      </div>
      <ol className="cvo-ai__steps">
        {AI_STEPS.map((text, i) => (
          <li key={text} className={i < step ? 'is-done' : i === step ? 'is-now' : ''}>
            <span className="cvo-ai__dot" aria-hidden="true">
              {i < step && <CheckIcon />}
            </span>
            {text}
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------- Before there is a review: no CV, unreadable CV, ready to review, reviewing ----------
function PreReview({ cv, onNotice }) {
  const { phase, fileName, analyseError, analyse, upload } = cv

  if (phase === 'analysing') return <Analysing fileName={fileName} />

  if (phase === 'unreadable') {
    return (
      <section className="cvo-alert" role="alert">
        <span className="cvo-alert__icon" aria-hidden="true">!</span>
        <div className="cvo-alert__text">
          <h2>We couldn't read the text in your CV</h2>
          <p>
            This happens with scanned or image-only files. Please upload your CV again as a PDF or Word file with
            selectable text.
          </p>
        </div>
        <UploadButton onUpload={upload} onNotice={onNotice} className="btn btn--primary">
          <UploadIcon />
          Upload CV again
        </UploadButton>
      </section>
    )
  }

  const noCv = phase === 'no-cv'
  return (
    <section className="cvo-card cvo-start">
      <span className="cvo-start__icon" aria-hidden="true">
        {noCv ? <UploadIcon /> : <SparkleIcon />}
      </span>
      <h2 className="cvo-start__title">{noCv ? 'Upload your CV to get started' : "Your CV hasn't been reviewed yet"}</h2>
      <p className="cvo-start__text">
        {noCv ? (
          "We'll score it out of 100 and suggest clearer wording, using only what you already wrote."
        ) : (
          <>
            We'll score {fileName ? <strong>{fileName}</strong> : 'your CV'} and suggest clearer wording, using only
            what you already wrote. A CV is reviewed once — upload a new CV to get a new review.
          </>
        )}
      </p>
      {analyseError && (
        <p className="cvo-start__error" role="alert">
          {analyseError}
        </p>
      )}
      {noCv ? (
        <>
          <UploadButton onUpload={upload} onNotice={onNotice} className="btn btn--primary">
            <UploadIcon />
            Choose your CV
          </UploadButton>
          <p className="cvo-hint">PDF or Word file · max 5 MB</p>
        </>
      ) : (
        <>
          <button type="button" className="btn btn--primary" onClick={analyse}>
            <SparkleIcon />
            {analyseError ? 'Try again' : 'Review my CV'}
          </button>
          <UploadButton onUpload={upload} onNotice={onNotice} className="cvo-link">
            Upload a different CV
          </UploadButton>
        </>
      )}
    </section>
  )
}

export default function CvOptimizer() {
  const cv = useCvReview()
  const { phase, review } = cv
  const navigate = useNavigate()
  const location = useLocation()
  // A message handed over by another page (e.g. "uploaded" after uploading from the Advanced report)
  const [notice, setNotice] = useState(() => location.state?.notice ?? null)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [allMissing, setAllMissing] = useState(false)

  // Shown once: clear it from the history entry so a reload or Back doesn't show it again
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  const head = (
    <PageHead title="AI CV Optimizer" sub="Rewords what you already wrote. Never adds skills or experience you don't have." />
  )
  const noticeBar = <Notice notice={notice} onClose={() => setNotice(null)} />

  if (phase === 'loading') {
    return (
      <main className="container cvo">
        {head}
        <OptimizerLoading />
      </main>
    )
  }
  if (phase === 'error') {
    return (
      <main className="container cvo">
        {head}
        {noticeBar}
        <ErrorState title="The AI CV Optimizer is not available right now" error={cv.error} onRetry={cv.reload} />
      </main>
    )
  }
  if (phase !== 'ready') {
    return (
      <main className="container cvo">
        {head}
        {noticeBar}
        <PreReview cv={cv} onNotice={setNotice} />
      </main>
    )
  }

  // ---------- The review ----------
  const free = review.suggestions.find((s) => !s.locked && s.isFreePreview)
  const locked = review.suggestions.filter((s) => s.locked)
  const count = review.improvementsFound
  const reviewedOn = `${review.resume.fileName} · reviewed ${formatDay(review.createdAt)}`
  const missing = allMissing ? review.missing : review.missing.slice(0, MISSING_SHOWN)

  // A line's "1 suggestion →": open its card here, or in the Advanced report
  function jumpTo(id) {
    const card = document.getElementById(`cvo-s-${id}`)
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' })
    else if (review.isAdvanced) navigate(`${REPORT_PATH}#cvo-s-${id}`)
  }

  async function confirmUnlock() {
    setUnlocking(true)
    const error = await cv.unlock()
    setUnlocking(false)
    setUnlockOpen(false)
    if (error) setNotice({ type: 'error', text: error })
    else navigate(REPORT_PATH)
  }

  const unlockButton = review.isAdvanced ? (
    <Link to={REPORT_PATH} className="btn btn--primary">
      View Advanced report →
    </Link>
  ) : (
    review.canUnlock && (
      <button type="button" className="btn btn--primary" onClick={() => setUnlockOpen(true)}>
        <LockIcon />
        Unlock – BHD {formatBhd(review.reportPrice.totalBhd)}
      </button>
    )
  )

  return (
    <main className="container cvo">
      {head}
      {noticeBar}

      {/* ---------- CV strength: now → with our rewrites → if you add what's missing ---------- */}
      <Panel title="Your CV strength" sub={`Based on ${reviewedOn}`} action={unlockButton} aria-label="CV score">
        <div className="cvo-rings">
          <StrengthRing score={review.currentScore} label="Now" />
          <Arrow />
          <StrengthRing score={review.potentialScore} label="With our rewrites" sub="possible" faded />
          {review.reachableScore !== review.potentialScore && (
            <>
              <Arrow />
              <StrengthRing score={review.reachableScore} label="If you add what's missing" sub="possible" faded />
            </>
          )}
        </div>
      </Panel>

      <div className="cvo-cols cvo-cols--opt">
        {/* ---------- Left: free suggestion, Advanced report, what only you can add ---------- */}
        <div className="cvo-col">
          {free && (
            <Panel title="AI suggestion" sub="Your free preview · accept it to update your CV">
              <SuggestionCard
                suggestion={free}
                variant="preview"
                plain
                busy={cv.saving}
                saving={cv.busyId === free.id}
                onDecide={cv.decide}
              />
            </Panel>
          )}
          {count === 0 && (
            <Panel title="No rewrites needed" sub="Your CV is already well worded. See below for what you could add." />
          )}

          {/* only when there is something in it: unlocked, or suggestions still locked
              (with just the free suggestion there is nothing to pay for, so no card) */}
          {(review.isAdvanced || locked.length > 0) && (
            <Panel title="Advanced report" sub="Every suggestion, a full rewrite and a comparison with strong CVs">
              {review.isAdvanced ? (
                <div className="cvo-lockrow cvo-lockrow--open">
                  <CheckIcon />
                  <span className="cvo-lockrow__text">
                    <strong>Unlocked.</strong> See all {count} rewrites and download the full report.
                  </span>
                  <Link to={REPORT_PATH} className="cvo-link">
                    Open →
                  </Link>
                </div>
              ) : (
                locked.length > 0 && (
                  <div className="cvo-lockrow">
                    <LockIcon />
                    <span className="cvo-lockrow__text">
                      <strong>
                        {locked.length} more {locked.length === 1 ? 'suggestion' : 'suggestions'}
                      </strong>{' '}
                      {locked.length === 1 ? 'is' : 'are'} in the Advanced report
                    </span>
                    {review.canUnlock && (
                      <button type="button" className="cvo-link" onClick={() => setUnlockOpen(true)}>
                        Unlock →
                      </button>
                    )}
                  </div>
                )
              )}
            </Panel>
          )}

          {review.missing.length > 0 && (
            <Panel
              title="What only you can add"
              sub={
                <>
                  We never invent facts. Add these to your CV if they are true, then{' '}
                  <UploadButton onUpload={cv.upload} onNotice={setNotice} className="cvo-link cvo-link--inline">
                    upload it again
                  </UploadButton>{' '}
                  to get a new score.
                </>
              }
              action={<span className="cvo-add__goal">Up to {review.reachableScore} / 100</span>}
              className="cvo-add"
            >
              <MissingList key={review.id} reviewId={review.id} items={missing} variant="list" />
              {review.missing.length > MISSING_SHOWN && (
                <button type="button" className="cvo-link cvo-more" onClick={() => setAllMissing(!allMissing)}>
                  {allMissing ? 'Show less' : `Show all ${review.missing.length} tips`}
                </button>
              )}
            </Panel>
          )}
        </div>

        {/* ---------- Right: the CV ---------- */}
        <div className="cvo-col">
          <CvPreview
            review={review}
            onJump={jumpTo}
            action={
              <DownloadButton
                path="/cv/optimizer/improved-cv"
                fileName="improved-cv.pdf"
                className="cvo-dl"
                title="Free · includes only the suggestions you accepted"
              >
                Download PDF
              </DownloadButton>
            }
          />
        </div>
      </div>

      <UnlockDialog
        open={unlockOpen}
        price={review.reportPrice}
        busy={unlocking}
        onConfirm={confirmUnlock}
        onCancel={() => setUnlockOpen(false)}
      />
    </main>
  )
}
