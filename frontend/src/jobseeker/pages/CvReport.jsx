import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Notice from '../../shared/components/Notice.jsx'
import useCvReview from '../utils/useCvReview.js'
import { formatBhd, formatFullDate, OPTIMIZER_PATH } from '../utils/cvFormat.js'
import { PageHead, ErrorState } from '../components/cvOptimizer/PageParts.jsx'
import { Panel, StrengthRing, Arrow, ReviewLoading } from '../components/cvOptimizer/StrengthParts.jsx'
import CvPreview from '../components/cvOptimizer/CvPreview.jsx'
import SuggestionCard from '../components/cvOptimizer/SuggestionCard.jsx'
import MissingList from '../components/cvOptimizer/MissingList.jsx'
import ComparisonList from '../components/cvOptimizer/ComparisonList.jsx'
import DownloadButton from '../components/cvOptimizer/DownloadButton.jsx'
import UploadButton from '../components/cvOptimizer/UploadButton.jsx'
import '../styles/CvOptimizer.css'

const MISSING_SHOWN = 4 // "Show all N tips" opens the rest

// Advanced CV report (wireframe 9): only for a review that has been unlocked; otherwise back to the optimizer page.
// CV strength, every rewrite to accept or dismiss, what only the seeker can add, the improved CV and the comparison.
export default function CvReport() {
  const cv = useCvReview()
  const { phase, review, user } = cv
  const location = useLocation()
  const navigate = useNavigate()
  const [notice, setNotice] = useState(null)
  // Uploading a new CV from here: the optimizer page takes over once it's done, with the outcome message
  const [leaving, setLeaving] = useState(false)
  const leavingRef = useRef(false)
  const [allMissing, setAllMissing] = useState(false)

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
        <PageHead title="Advanced CV report" sub={back} badge="Advanced" />
        <ReviewLoading label={leaving ? 'Uploading your new CV' : 'Loading your report'} />
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

  const total = review.suggestions.length
  const missing = allMissing ? review.missing : review.missing.slice(0, MISSING_SHOWN)
  // a line's "1 suggestion →" in the CV: its card is on this page
  const jumpTo = (id) => document.getElementById(`cvo-s-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <main className="container cvo">
      <PageHead title="Advanced CV report" sub={sub} badge="Advanced" />
      {noticeBar}

      {/* ---------- CV strength: now → if you accept all → if you add what's missing ---------- */}
      <Panel
        title="Your CV strength"
        sub={`${accepted} of ${total} ${total === 1 ? 'suggestion' : 'suggestions'} accepted · your score updates as you decide`}
        action={
          <DownloadButton path="/cv/optimizer/report" fileName="cv-report.pdf" className="btn btn--primary">
            Download full report (PDF)
          </DownloadButton>
        }
        aria-label="CV score"
      >
        <div className="cvo-rings">
          <StrengthRing score={review.currentScore} label="Now" />
          <Arrow />
          <StrengthRing score={review.potentialScore} label="If you accept all" sub="possible" faded />
          {review.reachableScore !== review.potentialScore && (
            <>
              <Arrow />
              <StrengthRing score={review.reachableScore} label="If you add what's missing" sub="possible" faded />
            </>
          )}
        </div>
      </Panel>

      <div className="cvo-cols cvo-cols--opt">
        {/* ---------- Left: every rewrite, then what only you can add ---------- */}
        <div className="cvo-col">
          <Panel
            title="Section-by-section rewrite"
            sub="Uses only what is already in your CV · accept or dismiss each one"
            className="cvo-rewrites"
          >
            {total > 0 ? (
              review.suggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  plain
                  busy={cv.saving}
                  saving={cv.busyId === s.id}
                  onDecide={cv.decide}
                />
              ))
            ) : (
              <p className="cvo-muted">No rewrites needed: your CV is already well worded.</p>
            )}
          </Panel>

          {review.missing.length > 0 && (
            <Panel
              title="What only you can add"
              sub="We never invent facts. Add these if they are true, then upload your CV again."
              action={<span className="cvo-add__goal">Up to {review.reachableScore} / 100</span>}
              className="cvo-add"
            >
              <MissingList key={review.id} reviewId={review.id} items={missing} variant="list" />
              <div className="cvo-add__foot">
                {review.missing.length > MISSING_SHOWN ? (
                  <button type="button" className="cvo-link" onClick={() => setAllMissing(!allMissing)}>
                    {allMissing ? 'Show less' : `Show all ${review.missing.length} tips`}
                  </button>
                ) : (
                  <span />
                )}
                <UploadButton onUpload={uploadNew} onNotice={showUploadNotice} className="cvo-link">
                  Upload a new CV →
                </UploadButton>
              </div>
            </Panel>
          )}
        </div>

        {/* ---------- Right: the improved CV, how it compares, the receipt ---------- */}
        <div className="cvo-col">
          <CvPreview
            review={review}
            onJump={jumpTo}
            title="Your improved CV"
            sub="Updates as you accept suggestions"
            action={
              <DownloadButton
                path="/cv/optimizer/improved-cv"
                fileName="improved-cv.pdf"
                className="cvo-dl"
                title="Includes only the suggestions you accepted"
              >
                Download PDF
              </DownloadButton>
            }
          />

          {review.comparison && <ComparisonList comparison={review.comparison} major={review.major} />}

          {review.payment && (
            <p className="cvo-paid">
              Paid {formatBhd(review.payment.totalBhd)} BHD on {formatFullDate(review.payment.paidAt)}
              {review.payment.isSimulated && ' · simulated'}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
