import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Notice from '../../shared/components/Notice.jsx'
import PaymentForm, { PaymentDone } from '../../company/components/PaymentForm.jsx'
import useCvReview from '../utils/useCvReview.js'
import { OPTIMIZER_PATH, REPORT_PATH } from '../utils/cvFormat.js'
import { ErrorState } from '../components/cvOptimizer/PageParts.jsx'
import '../styles/CvOptimizer.css'

// Payment: Advanced CV report. The same card form + order summary as a company plan,
// then "Payment successful" → Open my report.

const ITEM = 'Advanced CV report'

// Grey shapes of the form and the summary while the review loads (wireframe 23)
function PaymentLoading() {
  const line = (width, thin) => <span className={thin ? 'sk sk--line sk--thin' : 'sk sk--line'} style={{ width }} />
  return (
    <div className="pay-body cvp-loading" role="status" aria-label="Loading your order">
      <section className="pay-form" aria-hidden="true">
        {line(140)}
        {line(180, true)}
        {[0, 1].map((i) => (
          <div key={i} className="cvp-loading__field">
            {line(110, true)}
            <span className="sk cvp-sk-input" />
          </div>
        ))}
        <div className="pay-two">
          <span className="sk cvp-sk-input" />
          <span className="sk cvp-sk-input" />
        </div>
        <span className="sk cvp-sk-pay" />
      </section>
      <aside className="pay-summary cvp-loading__summary" aria-hidden="true">
        {line('40%', true)}
        {line('70%')}
        {line('55%', true)}
        {line('65%', true)}
        {line('60%', true)}
        {line('100%', true)}
        {line('80%')}
      </aside>
    </div>
  )
}

export default function CvPayment() {
  const cv = useCvReview()
  const { phase, review } = cv
  const [busy, setBusy] = useState(false)
  const [paid, setPaid] = useState(false) // paid on this page: show "Payment successful"
  const [notice, setNotice] = useState(null)

  const back = (
    <Link to={OPTIMIZER_PATH} className="cvo-back cvp-back">
      ← AI CV Optimizer
    </Link>
  )

  if (phase === 'loading') {
    return (
      <main className="container pay">
        {back}
        <PaymentLoading />
      </main>
    )
  }
  if (phase === 'error') {
    return (
      <main className="container pay cvo">
        {back}
        <ErrorState title="Could not load your order" error={cv.error} onRetry={cv.reload} />
      </main>
    )
  }

  if (paid && review?.payment) {
    const p = review.payment
    return (
      <main className="container pay">
        <PaymentDone
          name={ITEM}
          payment={{ total_bhd: p.totalBhd, receipt_no: p.receiptNo, paid_at: p.paidAt }}
          next={{ to: REPORT_PATH, label: 'Open my report' }}
        />
      </main>
    )
  }

  // Nothing to pay for here: not reviewed yet / nothing locked → the optimizer; already paid → the report
  if (phase !== 'ready') return <Navigate to={OPTIMIZER_PATH} replace />
  // (not while paying: the review turns Advanced a moment before "Payment successful" shows)
  if (review.isAdvanced && !busy) return <Navigate to={REPORT_PATH} replace />
  if (!review.canUnlock) return <Navigate to={OPTIMIZER_PATH} replace />

  const price = review.reportPrice
  const count = review.improvementsFound
  const order = {
    name: ITEM,
    sub: 'One-time payment',
    features: [
      `All ${count} ${count === 1 ? 'improvement' : 'improvements'}`,
      'Section-by-section rewrite',
      'Comparison with strong CVs'
    ],
    subtotal: price.subtotalBhd,
    vat: price.vatBhd,
    total: price.totalBhd,
    note: 'One-time payment. No subscription.'
  }

  async function pay({ emailReceipt }) {
    setBusy(true)
    setNotice(null)
    const error = await cv.unlock({ emailReceipt })
    setBusy(false)
    if (error) setNotice({ type: 'error', text: error })
    else setPaid(true)
  }

  return (
    <main className="container pay">
      {back}
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <PaymentForm order={order} busy={busy} onPay={pay} />
    </main>
  )
}
