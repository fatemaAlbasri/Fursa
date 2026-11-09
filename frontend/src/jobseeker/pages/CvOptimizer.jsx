import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Notice from '../../shared/components/Notice.jsx'
import { CheckIcon, FileIcon, LockIcon, SparkleIcon, UploadIcon } from '../../shared/components/icons.jsx'
import useCvReview from '../utils/useCvReview.js'
import { formatBhd, scoreTone, REPORT_PATH } from '../utils/cvFormat.js'
import { PageHead, LoadingState, ErrorState } from '../components/cvOptimizer/PageParts.jsx'
import ScoreRing from '../components/cvOptimizer/ScoreRing.jsx'
import CvPreview from '../components/cvOptimizer/CvPreview.jsx'
import SuggestionCard from '../components/cvOptimizer/SuggestionCard.jsx'
import LockedList from '../components/cvOptimizer/LockedList.jsx'
import MissingList from '../components/cvOptimizer/MissingList.jsx'
import DownloadButton from '../components/cvOptimizer/DownloadButton.jsx'
import UploadButton from '../components/cvOptimizer/UploadButton.jsx'
import UnlockDialog from '../components/cvOptimizer/UnlockDialog.jsx'
import '../styles/CvOptimizer.css'

// "44 now" → "65 with our rewrites" → "up to 98 if you add what's missing"
function Step({ score, label, prefix }) {
  return (
    <div className="cvo-step">
      <span className={`cvo-step__score cvo-tone--${scoreTone(score)}`}>
        {prefix && <span className="cvo-step__prefix">{prefix}</span>}
        {score}
      </span>
      <span className="cvo-step__label">{label}</span>
    </div>
  )
}

// ---------- Before there is a review: no CV, unreadable CV, ready to analyse, analysing ----------
function PreReview({ cv, onNotice }) {
  const { phase, fileName, analyseError, analyse, upload } = cv
  const uploadHint = <p className="cvo-hint">PDF or Word file · max 5 MB</p>

  if (phase === 'no-cv' || phase === 'unreadable') {
    const unreadable = phase === 'unreadable'
    return (
      <section className="cvo-card cvo-state">
        <span className="cvo-state__icon" aria-hidden="true">
          {unreadable ? <FileIcon /> : <UploadIcon />}
        </span>
        <h2 className="cvo-state__title">{unreadable ? "We couldn't read your CV" : 'Upload your CV to get started'}</h2>
        <p className="cvo-muted">
          {unreadable
            ? "It may be a scanned image. Upload a PDF or Word file where the text can be selected."
            : "We'll score it out of 100 and suggest rewrites that use only what you already wrote."}
        </p>
        <UploadButton onUpload={upload} onNotice={onNotice} className="btn btn--primary">
          <UploadIcon />
          {unreadable ? 'Upload a different CV' : 'Choose your CV'}
        </UploadButton>
        {uploadHint}
      </section>
    )
  }

  const analysing = phase === 'analysing'
  return (
    <section className="cvo-hero cvo-hero--start" aria-busy={analysing}>
      <span className={analysing ? 'cvo-hero__badge cvo-hero__badge--busy' : 'cvo-hero__badge'} aria-hidden="true">
        {analysing ? <span className="cvo-spinner cvo-spinner--light" /> : <SparkleIcon />}
      </span>
      <div className="cvo-hero__start">
        <h2 className="cvo-hero__title">{analysing ? 'Reviewing your CV…' : 'Your CV is ready to review'}</h2>
        <p className="cvo-hero__text">
          {analysing
            ? 'This can take a few minutes. Please keep this page open.'
            : 'Get a strength score and rewrites that use only what is already in your CV.'}
        </p>
        {fileName && (
          <p className="cvo-hero__file">
            <FileIcon /> {fileName}
          </p>
        )}
        {!analysing && (
          <ul className="cvo-hero__perks">
            <li><CheckIcon /> A score out of 100</li>
            <li><CheckIcon /> One free rewrite to try</li>
            <li><CheckIcon /> What you can add yourself</li>
          </ul>
        )}
        {analyseError && !analysing && (
          <p className="cvo-hero__error" role="alert">
            {analyseError}
          </p>
        )}
        {!analysing && (
          <div className="cvo-hero__actions">
            <button type="button" className="btn cvo-btn-accent" onClick={analyse}>
              <SparkleIcon />
              {analyseError ? 'Try again' : 'Analyse my CV'}
            </button>
            <UploadButton onUpload={upload} onNotice={onNotice} className="cvo-link cvo-link--light">
              Upload a different CV
            </UploadButton>
          </div>
        )}
      </div>
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

  // Shown once: clear it from the history entry so a reload or Back doesn't show it again
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])
  const [unlocking, setUnlocking] = useState(false)

  const head = (
    <PageHead title="AI CV Optimizer" sub="Rewords what you already wrote. Never adds skills or experience you don't have." />
  )
  const noticeBar = <Notice notice={notice} onClose={() => setNotice(null)} />

  if (phase === 'loading') {
    return (
      <main className="container cvo">
        {head}
        <LoadingState text="Loading your CV review…" />
      </main>
    )
  }
  if (phase === 'error') {
    return (
      <main className="container cvo">
        {head}
        {noticeBar}
        <ErrorState title="Could not load the AI CV Optimizer" error={cv.error} onRetry={cv.reload} />
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
  const freeCount = review.suggestions.filter((s) => s.isFreePreview).length
  const count = review.improvementsFound

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

  return (
    <main className="container cvo">
      {head}
      {noticeBar}

      {/* ---------- Score ---------- */}
      <section className="cvo-hero">
        <ScoreRing score={review.currentScore} />
        <div className="cvo-hero__body">
          <div className="cvo-steps">
            <Step score={review.currentScore} label="now" />
            <span className="cvo-steps__arrow" aria-hidden="true">→</span>
            <Step score={review.potentialScore} label="with our rewrites" />
            <span className="cvo-steps__arrow" aria-hidden="true">→</span>
            <Step score={review.reachableScore} prefix="up to " label="if you add what's missing" />
          </div>
          <div className="cvo-hero__foot">
            <p className="cvo-hero__count">
              <strong>
                {count} {count === 1 ? 'improvement' : 'improvements'} found
              </strong>
              {review.isAdvanced ? ' · all unlocked' : freeCount > 0 && ` · ${freeCount} free`}
            </p>
            {review.isAdvanced ? (
              <Link to={REPORT_PATH} className="btn cvo-btn-accent">
                View Advanced report →
              </Link>
            ) : (
              review.canUnlock && (
                <button type="button" className="btn cvo-btn-accent" onClick={() => setUnlockOpen(true)}>
                  <LockIcon />
                  Unlock – BHD {formatBhd(review.reportPrice.totalBhd)}
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {/* ---------- CV + suggestions ---------- */}
      <div className="cvo-cols">
        <div className="cvo-col">
          <CvPreview review={review} onJump={jumpTo} />
          <DownloadButton
            path="/cv/optimizer/improved-cv"
            fileName="improved-cv.pdf"
            className="btn btn--block cvo-btn-outline"
          >
            Download improved CV (PDF)
          </DownloadButton>
          <p className="cvo-caption">Free · includes only the suggestions you accepted</p>
        </div>

        <div className="cvo-col">
          {free && (
            <SuggestionCard
              suggestion={free}
              variant="preview"
              busy={cv.saving}
              saving={cv.busyId === free.id}
              onDecide={cv.decide}
            />
          )}
          {!review.isAdvanced && locked.length > 0 && (
            <LockedList suggestions={locked} canUnlock={review.canUnlock} onUnlock={() => setUnlockOpen(true)} />
          )}
          {review.isAdvanced && (
            <section className="cvo-card cvo-unlocked">
              <span className="cvo-badge">Advanced</span>
              <h2 className="cvo-card__title">Your Advanced report is unlocked</h2>
              <p className="cvo-muted">
                See all {count} rewrites, accept or dismiss each one, and download the full report.
              </p>
              <Link to={REPORT_PATH} className="cvo-link">
                Open the Advanced report →
              </Link>
            </section>
          )}
          {count === 0 && (
            <section className="cvo-card cvo-unlocked">
              <h2 className="cvo-card__title">No rewrites needed</h2>
              <p className="cvo-muted">Your CV is already well worded. See below for what you could add.</p>
            </section>
          )}
        </div>
      </div>

      {/* ---------- What only you can add ---------- */}
      {review.missing.length > 0 && (
        <section className="cvo-card cvo-add">
          <header className="cvo-add__head">
            <div>
              <h2 className="cvo-card__title">What only you can add</h2>
              <p className="cvo-muted">
                We never invent facts. Add these to your CV if they are true, then{' '}
                <UploadButton onUpload={cv.upload} onNotice={setNotice} className="cvo-link cvo-link--inline">
                  upload it again
                </UploadButton>{' '}
                to get a new score.
              </p>
            </div>
            <span className="cvo-add__goal">Up to {review.reachableScore} / 100</span>
          </header>
          <MissingList key={review.id} reviewId={review.id} items={review.missing} variant="grid" />
        </section>
      )}

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
