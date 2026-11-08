import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Notice from '../../shared/components/Notice.jsx'
import useCvReview from '../utils/useCvReview.js'
import { formatBhd, formatFullDate, scoreTone, OPTIMIZER_PATH } from '../utils/cvFormat.js'
import { PageHead, LoadingState, ErrorState } from '../components/cvOptimizer/PageParts.jsx'
import ScoreRing from '../components/cvOptimizer/ScoreRing.jsx'
import SuggestionCard from '../components/cvOptimizer/SuggestionCard.jsx'
import MissingList from '../components/cvOptimizer/MissingList.jsx'
import ComparisonList from '../components/cvOptimizer/ComparisonList.jsx'
import DownloadButton from '../components/cvOptimizer/DownloadButton.jsx'
import UploadButton from '../components/cvOptimizer/UploadButton.jsx'
import '../styles/CvOptimizer.css'

// One score box in the navy panel: "Now 44 when reviewed"
function Tile({ label, score, note }) {
  return (
    <div className="cvo-tile">
      <span className="cvo-tile__label">{label}</span>
      <span className={`cvo-tile__score cvo-tone--${scoreTone(score)}`}>{score}</span>
      <span className="cvo-tile__note">{note}</span>
    </div>
  )
}

// Advanced CV report: only for a review that has been unlocked; otherwise back to the optimizer page
export default function CvReport() {
  const cv = useCvReview()
  const { phase, review, user } = cv
  const location = useLocation()
  const navigate = useNavigate()
  const [notice, setNotice] = useState(null)
  // Uploading a new CV from here: the optimizer page takes over once it's done, with the outcome message
  const [leaving, setLeaving] = useState(false)
  const leavingRef = useRef(false)

  // Opened from a line's "1 suggestion →" on the optimizer page: scroll to that card
  const ready = phase === 'ready' && review?.isAdvanced
  useEffect(() => {
    if (!ready || !location.hash) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' })
  }, [ready, location.hash])

  const back = (
    <Link to={OPTIMIZER_PATH} className="cvo-back">
      ← AI CV Optimizer
    </Link>
  )

  const noticeBar = <Notice notice={notice} onClose={() => setNotice(null)} />

  if (phase === 'loading' || leaving) {
    return (
      <main className="container cvo">
        <PageHead title="Advanced CV report" sub={back} />
        <LoadingState text={leaving ? 'Uploading your new CV…' : 'Loading your report…'} />
      </main>
    )
  }
  if (phase === 'error') {
    return (
      <main className="container cvo">
        <PageHead title="Advanced CV report" sub={back} />
        {noticeBar}
        <ErrorState title="Could not load your report" error={cv.error} onRetry={cv.reload} />
      </main>
    )
  }
  // Not reviewed, or not unlocked (also right after uploading a new CV here)
  if (!ready) return <Navigate to={OPTIMIZER_PATH} replace />

  const accepted = review.suggestions.filter((s) => s.status === 'accepted').length
  const name = user ? `${user.first_name} ${user.last_name}`.trim() : ''
  const sub = (
    <>
      {back}
      {name && ` · ${name}`}
      {review.major && ` · ${review.major}`}
    </>
  )

  // A new CV has no review yet: the optimizer page takes it from here.
  // While uploading, this page shows a loading state instead of redirecting on its own,
  // so the outcome message can be handed to the optimizer page (it is shown there).
  async function uploadNew(file) {
    leavingRef.current = true
    setLeaving(true)
    const result = await cv.upload(file)
    if (result.error) {
      leavingRef.current = false
      setLeaving(false)
    }
    return result
  }
  function showUploadNotice(next) {
    if (next && leavingRef.current) navigate(OPTIMIZER_PATH, { state: { notice: next } })
    else setNotice(next)
  }

  return (
    <main className="container cvo">
      <PageHead title="Advanced CV report" sub={sub} badge="Advanced" />
      {noticeBar}

      {/* ---------- Scores ---------- */}
      <section className="cvo-hero cvo-hero--report">
        <div className="cvo-hero__now">
          <ScoreRing score={review.currentScore} />
          <div>
            <p className="cvo-hero__label">Your score now</p>
            <p className="cvo-hero__big">
              {accepted} of {review.suggestions.length} accepted
            </p>
          </div>
        </div>
        <div className="cvo-tiles">
          <Tile label="Now" score={review.strengthScore} note="when reviewed" />
          <Tile label="After the rewrites" score={review.potentialScore} note="if you accept all" />
          <Tile label="Up to" score={review.reachableScore} note="if you add what's missing" />
        </div>
      </section>

      <div className="cvo-downloads">
        <DownloadButton path="/cv/optimizer/report" fileName="cv-report.pdf" className="btn btn--primary btn--block">
          Download full report (PDF)
        </DownloadButton>
        <DownloadButton
          path="/cv/optimizer/improved-cv"
          fileName="improved-cv.pdf"
          className="btn btn--block cvo-btn-outline"
        >
          Download improved CV (PDF)
        </DownloadButton>
      </div>

      <div className="cvo-cols cvo-cols--report">
        {/* ---------- Rewrites ---------- */}
        <section className="cvo-col">
          <header className="cvo-col__head">
            <h2 className="cvo-col__title">Section-by-section rewrite</h2>
            <span className="cvo-col__note">Uses only what is already in your CV</span>
          </header>
          {review.suggestions.length > 0 ? (
            review.suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                busy={cv.saving}
                saving={cv.busyId === s.id}
                onDecide={cv.decide}
              />
            ))
          ) : (
            <div className="cvo-card">
              <p className="cvo-muted">No rewrites needed: your CV is already well worded.</p>
            </div>
          )}
        </section>

        {/* ---------- What to add + comparison ---------- */}
        <aside className="cvo-col">
          {review.missing.length > 0 && (
            <section className="cvo-card cvo-add">
              <h2 className="cvo-card__title">What only you can add</h2>
              <p className="cvo-muted">
                We never invent facts. Add these to your CV if they are true, then upload it again to get a new score.
              </p>
              <MissingList key={review.id} reviewId={review.id} items={review.missing} variant="list" />
              <div className="cvo-next">
                <span className="cvo-next__label">Next step</span>
                <p className="cvo-next__text">
                  Add the items above that are true for you, then upload your CV again (up to {review.reachableScore}{' '}
                  / 100).
                </p>
                <UploadButton onUpload={uploadNew} onNotice={showUploadNotice} className="cvo-link">
                  Upload a new CV →
                </UploadButton>
              </div>
            </section>
          )}

          {review.comparison && <ComparisonList comparison={review.comparison} major={review.major} />}

          {review.payment && (
            <p className="cvo-paid">
              Paid {formatBhd(review.payment.totalBhd)} BHD on {formatFullDate(review.payment.paidAt)}
              {review.payment.isSimulated && ' · simulated'}
            </p>
          )}
        </aside>
      </div>
    </main>
  )
}
