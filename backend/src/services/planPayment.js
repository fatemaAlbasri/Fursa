const db = require('../config/db')
const { sendMail } = require('../config/mailer')

// Shared by plan changes (PlanController) and company sign up with a paid plan (AuthController).

const PAYMENT_METHODS = ['card']

// Price + VAT 10% , total = subtotal + vat exactly
const PLAN_COLUMNS = `
  p.id, p.name, p.price_bhd_month, p.max_active_jobs,
  p.has_ai_ranking, p.has_match_reasons, p.has_bulk_actions, p.has_hiring_summary,
  ROUND(p.price_bhd_month * 0.10, 3) AS vat_bhd,
  p.price_bhd_month + ROUND(p.price_bhd_month * 0.10, 3) AS total_bhd`

const receiptNo = (id) => `FUR-${String(id).padStart(6, '0')}`

const paymentOut = (p) => ({
  id: p.id,
  receipt_no: receiptNo(p.id),
  item: p.item,
  plan_name: p.plan_name || null,
  method: p.method,
  subtotal_bhd: Number(p.subtotal_bhd),
  vat_bhd: Number(p.vat_bhd),
  total_bhd: Number(p.total_bhd),
  status: p.status,
  is_simulated: p.is_simulated,
  paid_at: p.paid_at
})

// New active subscription for the company (+ simulated payment if the plan costs money)
// and a notification. `plan` = a row selected with PLAN_COLUMNS. Run inside a transaction.
async function startSubscription(client, { userId, companyId, plan, method }) {
  const isPaid = Number(plan.price_bhd_month) > 0
  const { rows: sub } = await client.query(
    `INSERT INTO subscriptions (company_id, plan_id, renews_at)
     VALUES ($1, $2, CASE WHEN $3::boolean THEN now() + interval '1 month' END)
     RETURNING id, started_at, renews_at`,
    [companyId, plan.id, isPaid]
  )

  let payment = null
  if (isPaid) {
    const { rows: pay } = await client.query(
      `INSERT INTO payments (user_id, subscription_id, item, method, subtotal_bhd, vat_bhd, total_bhd, status, is_simulated, paid_at)
       VALUES ($1, $2, 'plan', $3, $4, $5, $6, 'paid', true, now())
       RETURNING id, item, method, subtotal_bhd, vat_bhd, total_bhd, status, is_simulated, paid_at`,
      [userId, sub[0].id, method, plan.price_bhd_month, plan.vat_bhd, plan.total_bhd]
    )
    payment = { ...pay[0], plan_name: plan.name }
  }

  await client.query(
    `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'plan', $2, $3)`,
    [
      userId,
      `You are now on the ${plan.name} plan`,
      isPaid
        ? `Paid BHD ${Number(plan.total_bhd).toFixed(3)} (simulated). Receipt ${receiptNo(payment.id)}.`
        : 'Your plan was changed to Free.'
    ]
  )
  return { subscription: sub[0], payment }
}

// "Email me the receipt" — sent after answering, a failed email never fails the payment
function emailReceipt(userId, payment) {
  const p = paymentOut(payment)
  db.query('SELECT email, first_name FROM users WHERE id = $1', [userId])
    .then(({ rows }) =>
      sendMail({
        to: rows[0].email,
        subject: `Fursa receipt ${p.receipt_no}`,
        text:
          `Hi ${rows[0].first_name},\n\n${p.plan_name ? `${p.plan_name} plan · monthly` : 'Advanced CV report · one-time'}\n` +
          `Subtotal: BHD ${p.subtotal_bhd.toFixed(3)}\nVAT (10%): BHD ${p.vat_bhd.toFixed(3)}\n` +
          `Total: BHD ${p.total_bhd.toFixed(3)}\n\nPilot version: this payment is simulated. No card was charged.`
      })
    )
    .catch((err) => console.error('Receipt email failed:', err.message))
}

module.exports = { PAYMENT_METHODS, PLAN_COLUMNS, receiptNo, paymentOut, startSubscription, emailReceipt }
