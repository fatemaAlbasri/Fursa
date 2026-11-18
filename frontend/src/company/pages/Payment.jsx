import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../shared/api.js'
import { formatDeadline } from '../../shared/utils/jobFormat.js'
import { planFeatures, formatBHD } from '../data/plans.js'
import Notice from '../../shared/components/Notice.jsx'
import Loading, { ButtonSpinner } from '../../shared/components/Loading.jsx'
import { CardIcon } from '../../shared/components/icons.jsx'
import '../styles/Payment.css'

// Payment page for a plan
// pilot version: the card is only checked here, it's never sent or saved

const EMPTY = { name: '', number: '', expiry: '', cvv: '' }

// own check icon so it can be drawn with an animation
const CheckIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path className="pay-check" d="M5 12l5 5 9-10" pathLength="1" />
  </svg>
)

function Field({ label, error, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}

// name, 16 digits, expiry not in the past, 3-4 digit cvv
function checkCard(card) {
  const errs = {}
  if (!card.name.trim()) errs.name = 'Enter the name on the card'
  if (!/^\d{16}$/.test(card.number.replace(/\s/g, '')))
    errs.number = 'Enter the 16 digits'
  const [mm, yy] = card.expiry.split('/').map((s) => Number(s.trim()))
  const lastDay = new Date(2000 + yy, mm, 0, 23, 59)
  if (!(mm >= 1 && mm <= 12 && yy >= 0) || lastDay < new Date())
    errs.expiry = 'Enter a valid date (MM / YY)'
  if (!/^\d{3,4}$/.test(card.cvv)) errs.cvv = 'Enter 3 or 4 digits'
  return errs
}

export default function Payment() {
  const { planId } = useParams()
  const navigate = useNavigate()

  const [plan, setPlan] = useState(null)
  const [company, setCompany] = useState('')
  const [card, setCard] = useState(EMPTY)
  const [emailReceipt, setEmailReceipt] = useState(true)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [payment, setPayment] = useState(null)

  useEffect(() => {
    api('/plans')
      .then((data) => {
        const found = data.plans.find((p) => p.id === Number(planId))
        if (!found)
          return setNotice({ type: 'error', text: 'This plan does not exist.' })
        // free plan doesn't need payment
        if (!found.price_bhd)
          return navigate('/company/plans', { replace: true })
        setPlan(found)
      })
      .catch((err) =>
        setNotice({
          type: 'error',
          text: err.error || 'Could not load the plan.'
        })
      )
    api('/auth/me')
      .then(({ user }) => setCompany(user.company?.name || ''))
      .catch(() => {})
  }, [planId, navigate])

  const change = (e) => {
    setCard({ ...card, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: undefined })
  }

  const pay = async () => {
    const errs = checkCard(card)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setBusy(true)
    setNotice(null)
    try {
      const data = await api('/plans/subscribe', {
        method: 'POST',
        body: { planId: plan.id, method: 'card', emailReceipt }
      })
      setPayment(data.payment)
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.error || 'Could not pay. Try again.'
      })
    } finally {
      setBusy(false)
    }
  }

  // after paying
  if (payment) {
    return (
      <main className="container pay">
        <section className="pay-done">
          <span className="pay-done__icon">{CheckIcon}</span>
          <h1>Payment successful</h1>
          <p>
            {plan.name} plan · monthly · {formatBHD(payment.total_bhd)}
            <br />
            Receipt no. {payment.receipt_no} · {formatDeadline(payment.paid_at)}
          </p>
          <Link to="/company" className="pay-done__next">
            Go to my jobs
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="container pay">
      <Notice notice={notice} onClose={() => setNotice(null)} />
      {!plan && !notice && <Loading text="Loading your order…" />}

      {plan && (
        <div className="pay-body">
          <section className="pay-form">
            <h1>Payment</h1>

            <fieldset className="pay-method">
              <legend>Payment method</legend>
              <button
                type="button"
                role="radio"
                aria-checked="true"
                className="pay-method__option"
              >
                <CardIcon />
                Debit / credit card
              </button>
            </fieldset>

            <Field label="Name on card" error={errors.name}>
              <input
                name="name"
                value={card.name}
                onChange={change}
                autoComplete="cc-name"
              />
            </Field>
            <Field label="Card number" error={errors.number}>
              <input
                name="number"
                inputMode="numeric"
                maxLength={19}
                placeholder="1234 5678 9012 3456"
                value={card.number}
                onChange={change}
                autoComplete="cc-number"
              />
            </Field>
            <div className="pay-two">
              <Field label="Expiry date" error={errors.expiry}>
                <input
                  name="expiry"
                  placeholder="MM / YY"
                  maxLength={7}
                  value={card.expiry}
                  onChange={change}
                  autoComplete="cc-exp"
                />
              </Field>
              <Field label="CVV" error={errors.cvv}>
                <input
                  name="cvv"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="123"
                  value={card.cvv}
                  onChange={change}
                  autoComplete="cc-csc"
                />
              </Field>
            </div>

            <label className="pay-receipt">
              <input
                type="checkbox"
                checked={emailReceipt}
                onChange={(e) => setEmailReceipt(e.target.checked)}
              />
              Email me the receipt
            </label>

            <button
              type="button"
              className="pay-btn"
              onClick={pay}
              disabled={busy}
            >
              {busy ? (
                <>
                  <ButtonSpinner />
                  Processing payment…
                </>
              ) : (
                `Pay ${formatBHD(plan.total_bhd)}`
              )}
            </button>
            <p className="pay-pilot">
              Pilot version: payment is simulated. No real card is charged.
            </p>
          </section>

          {/* order summary */}
          <aside className="pay-summary">
            <p className="pay-summary__kicker">ORDER SUMMARY</p>
            <p className="pay-summary__name">{plan.name} plan · monthly</p>
            {company && <p className="pay-summary__muted">{company}</p>}
            <ul className="pay-summary__list">
              {planFeatures(plan)
                .filter(([, included]) => included)
                .map(([text]) => (
                  <li key={text}>
                    <span>✓</span>
                    {text}
                  </li>
                ))}
            </ul>
            <hr />
            <p className="pay-summary__row">
              <span>Subtotal</span>
              <span>{formatBHD(plan.price_bhd)}</span>
            </p>
            <p className="pay-summary__row">
              <span>VAT (10%)</span>
              <span>{formatBHD(plan.vat_bhd)}</span>
            </p>
            <p className="pay-summary__row pay-summary__total">
              <span>Total</span>
              <span>{formatBHD(plan.total_bhd)}</span>
            </p>
            <p className="pay-summary__note">
              Renews every month. Cancel any time from your profile.
            </p>
          </aside>
        </div>
      )}
    </main>
  )
}
