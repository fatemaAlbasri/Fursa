const db = require('../config/db')
const { inTransaction } = require('../config/transaction')
const { sendMail } = require('../config/mailer')

const PAYMENT_METHODS = ['card', 'benefitpay']

// Price + VAT 10% , total = subtotal + vat exactly
const PLAN_COLUMNS = `
  p.id, p.name, p.price_bhd_month, p.max_active_jobs,
  p.has_ai_ranking, p.has_match_reasons, p.has_bulk_actions, p.has_hiring_summary,
  ROUND(p.price_bhd_month * 0.10, 3) AS vat_bhd,
  p.price_bhd_month + ROUND(p.price_bhd_month * 0.10, 3) AS total_bhd`

const planOut = (p) => ({
  id: p.id,
  name: p.name,
  price_bhd: Number(p.price_bhd_month),
  vat_bhd: Number(p.vat_bhd),
  total_bhd: Number(p.total_bhd),
  max_active_jobs: p.max_active_jobs, 
  features: {
    ai_ranking: p.has_ai_ranking,
    match_reasons: p.has_match_reasons,
    bulk_actions: p.has_bulk_actions,
    hiring_summary: p.has_hiring_summary
  }
})

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

// GET /api/plans
const getPlans = async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT ${PLAN_COLUMNS} FROM plans p ORDER BY p.price_bhd_month`)
    res.json({ plans: rows.map(planOut) })
  } catch (err) {
    next(err)
  }
}

// GET /api/plans/mine (company) 
const getMyPlan = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ${PLAN_COLUMNS}, s.id AS subscription_id, s.started_at, s.renews_at,
              (SELECT COUNT(*)::int FROM jobs j
                WHERE j.company_id = c.id AND j.status = 'open' AND j.deadline >= CURRENT_DATE) AS active_jobs
         FROM companies c
         JOIN subscriptions s ON s.company_id = c.id AND s.status = 'active'
         JOIN plans p ON p.id = s.plan_id
        WHERE c.user_id = $1`,
      [req.user.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'No active plan' })
    const r = rows[0]
    res.json({
      plan: planOut(r),
      subscription: { id: r.subscription_id, started_at: r.started_at, renews_at: r.renews_at },
      usage: { active_jobs: r.active_jobs, max_active_jobs: r.max_active_jobs }
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/plans/subscribe { planId, method?, emailReceipt? } (company)
// Card details are never sent to the backend and never saved.
const subscribe = async (req, res, next) => {
  const planId = Number(req.body?.planId)
  const method = req.body?.method
  if (!Number.isInteger(planId) || planId < 1) {
    return res.status(400).json({ error: 'Choose a plan', fields: { planId: 'Required' } })
  }

  try {
    const result = await inTransaction(async (client) => {
      const { rows: comp } = await client.query(
        'SELECT id, name FROM companies WHERE user_id = $1 FOR UPDATE',
        [req.user.id]
      )
      const company = comp[0]
      if (!company) return { code: 404, error: 'Company not found' }

      const { rows: plans } = await client.query(`SELECT ${PLAN_COLUMNS} FROM plans p WHERE p.id = $1`, [planId])
      const plan = plans[0]
      if (!plan) return { code: 404, error: 'Plan not found' }

      const isPaid = Number(plan.price_bhd_month) > 0
      if (isPaid && !PAYMENT_METHODS.includes(method)) {
        return { code: 400, error: 'Please choose how to pay', fields: { method: 'Card or BenefitPay' } }
      }

      const { rows: current } = await client.query(
        "SELECT id, plan_id FROM subscriptions WHERE company_id = $1 AND status = 'active'",
        [company.id]
      )
      if (current[0]?.plan_id === plan.id) {
        return { code: 409, error: `You are already on the ${plan.name} plan` }
      }

      // moving to a smaller plan: the open jobs must fit in it
      if (plan.max_active_jobs !== null) {
        const { rows } = await client.query(
          `SELECT COUNT(*)::int AS count FROM jobs
            WHERE company_id = $1 AND status = 'open' AND deadline >= CURRENT_DATE`,
          [company.id]
        )
        if (rows[0].count > plan.max_active_jobs) {
          return {
            code: 409,
            error: `You have ${rows[0].count} active jobs. The ${plan.name} plan allows ${plan.max_active_jobs}. Close some jobs first.`
          }
        }
      }

      // only one active subscription (one_active_subscription index)
      if (current[0]) {
        await client.query("UPDATE subscriptions SET status = 'cancelled' WHERE id = $1", [current[0].id])
      }
      const { rows: sub } = await client.query(
        `INSERT INTO subscriptions (company_id, plan_id, renews_at)
         VALUES ($1, $2, CASE WHEN $3::boolean THEN now() + interval '1 month' END)
         RETURNING id, started_at, renews_at`,
        [company.id, plan.id, isPaid]
      )

      let payment = null
      if (isPaid) {
        const { rows: pay } = await client.query(
          `INSERT INTO payments (user_id, subscription_id, item, method, subtotal_bhd, vat_bhd, total_bhd, status, is_simulated, paid_at)
           VALUES ($1, $2, 'plan', $3, $4, $5, $6, 'paid', true, now())
           RETURNING id, item, method, subtotal_bhd, vat_bhd, total_bhd, status, is_simulated, paid_at`,
          [req.user.id, sub[0].id, method, plan.price_bhd_month, plan.vat_bhd, plan.total_bhd]
        )
        payment = { ...pay[0], plan_name: plan.name }
      }

      await client.query(
        `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'plan', $2, $3)`,
        [
          req.user.id,
          `You are now on the ${plan.name} plan`,
          isPaid
            ? `Paid BHD ${Number(plan.total_bhd).toFixed(3)} (simulated). Receipt ${receiptNo(payment.id)}.`
            : 'Your plan was changed to Free.'
        ]
      )
      return { plan, subscription: sub[0], payment }
    })

    if (result.error) {
      return res.status(result.code).json({ error: result.error, ...(result.fields && { fields: result.fields }) })
    }

    res.status(201).json({
      plan: planOut(result.plan),
      subscription: result.subscription,
      payment: result.payment && paymentOut(result.payment)
    })

    // "Email me the receipt" (ticked by default in the wireframe), sent after answering
    if (result.payment && req.body?.emailReceipt !== false) {
      const p = paymentOut(result.payment)
      db.query('SELECT email, first_name FROM users WHERE id = $1', [req.user.id])
        .then(({ rows }) =>
          sendMail({
            to: rows[0].email,
            subject: `Fursa receipt ${p.receipt_no}`,
            text:
              `Hi ${rows[0].first_name},\n\n${p.plan_name} plan · monthly\n` +
              `Subtotal: BHD ${p.subtotal_bhd.toFixed(3)}\nVAT (10%): BHD ${p.vat_bhd.toFixed(3)}\n` +
              `Total: BHD ${p.total_bhd.toFixed(3)}\n\nPilot version: this payment is simulated. No card was charged.`
          })
        )
        .catch((err) => console.error('Receipt email failed:', err.message))
    }
  } catch (err) {
    next(err)
  }
}

// GET /api/plans/payments (any signed-in user) → receipts, newest first
const getPayments = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT pay.id, pay.item, pay.method, pay.subtotal_bhd, pay.vat_bhd, pay.total_bhd,
              pay.status, pay.is_simulated, pay.paid_at, p.name AS plan_name
         FROM payments pay
         LEFT JOIN subscriptions s ON s.id = pay.subscription_id
         LEFT JOIN plans p ON p.id = s.plan_id
        WHERE pay.user_id = $1
        ORDER BY pay.paid_at DESC NULLS LAST, pay.id DESC`,
      [req.user.id]
    )
    res.json({ payments: rows.map(paymentOut) })
  } catch (err) {
    next(err)
  }
}

module.exports = { getPlans, getMyPlan, subscribe, getPayments }
