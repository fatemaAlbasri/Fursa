import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDeadline } from '../../shared/utils/jobFormat.js'
import { planFeatures, formatBHD } from '../data/plans.js'
import { ButtonSpinner } from '../../shared/components/Loading.jsx'
import { CardIcon } from '../../shared/components/icons.jsx'
import '../styles/Payment.css'

// Card form + order summary, used by the Payment page and by company sign up (step 3).
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

// What the order summary shows for a company plan
function planOrder(plan, company) {
  return {
    name: `${plan.name} plan · monthly`,
    sub: company,
    features: planFeatures(plan)
      .filter(([, included]) => included)
      .map(([text]) => text),
    subtotal: plan.price_bhd,
    vat: plan.vat_bhd,
    total: plan.total_bhd,
    note: 'Renews every month. Cancel any time from your profile.'
  }
}

// `plan` = a plan from /api/plans, `company` = name for the summary,
// or `order` = { name, sub, features, subtotal, vat, total, note } for anything else (the Advanced CV report).
// `onPay({ emailReceipt })` runs once the card looks valid, `busy` = paying right now
export default function PaymentForm({ plan, company, order, busy, onPay }) {
  const o = order || planOrder(plan, company)
  const [card, setCard] = useState(EMPTY)
  const [emailReceipt, setEmailReceipt] = useState(true)
  const [errors, setErrors] = useState({})

  const change = (e) => {
    setCard({ ...card, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: undefined })
  }

  const pay = () => {
    const errs = checkCard(card)
    setErrors(errs)
    if (Object.keys(errs).length === 0) onPay({ emailReceipt })
  }

  return (
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

        <button type="button" className="pay-btn" onClick={pay} disabled={busy}>
          {busy ? (
            <>
              <ButtonSpinner />
              Processing payment…
            </>
          ) : (
            `Pay ${formatBHD(o.total)}`
          )}
        </button>
        <p className="pay-pilot">
          Pilot version: payment is simulated. No real card is charged.
        </p>
      </section>

      {/* order summary */}
      <aside className="pay-summary">
        <p className="pay-summary__kicker">ORDER SUMMARY</p>
        <p className="pay-summary__name">{o.name}</p>
        {o.sub && <p className="pay-summary__muted">{o.sub}</p>}
        <ul className="pay-summary__list">
          {o.features.map((text) => (
            <li key={text}>
              <span>✓</span>
              {text}
            </li>
          ))}
        </ul>
        <hr />
        <p className="pay-summary__row">
          <span>Subtotal</span>
          <span>{formatBHD(o.subtotal)}</span>
        </p>
        <p className="pay-summary__row">
          <span>VAT (10%)</span>
          <span>{formatBHD(o.vat)}</span>
        </p>
        <p className="pay-summary__row pay-summary__total">
          <span>Total</span>
          <span>{formatBHD(o.total)}</span>
        </p>
        <p className="pay-summary__note">{o.note}</p>
      </aside>
    </div>
  )
}

// "Payment successful" with the receipt number.
// For a plan: `plan` + `payment` (from the API). For anything else: `name`, `next` = { to, label } too.
export function PaymentDone({ plan, payment, name, next = { to: '/company', label: 'Go to my jobs' } }) {
  return (
    <section className="pay-done">
      <span className="pay-done__icon">{CheckIcon}</span>
      <h1>Payment successful</h1>
      <p>
        {name || `${plan.name} plan · monthly`} · {formatBHD(payment.total_bhd)}
        <br />
        Receipt no. {payment.receipt_no} · {formatDeadline(payment.paid_at)}
      </p>
      <Link to={next.to} className="pay-done__next">
        {next.label}
      </Link>
    </section>
  )
}
