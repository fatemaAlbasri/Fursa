import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Notice from '../../shared/components/Notice.jsx'
import PaymentForm, { PaymentDone, PaymentLoading } from '../../company/components/PaymentForm.jsx'
import useCvReview from '../utils/useCvReview.js'
import { OPTIMIZER_PATH, REPORT_PATH } from '../utils/cvFormat.js'
import { ErrorState } from '../components/cvOptimizer/PageParts.jsx'
import '../styles/CvOptimizer.css'

// Payment: Advanced CV report. The same card form + order summary as a company plan,
// then "Payment successful" → Open my report.

const ITEM = 'Advanced CV report'

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
