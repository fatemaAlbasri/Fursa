const db = require('../config/db')

// Paid plans whose month ended
const renewDuePlans = async () => {
  const { rowCount } = await db.query(
    `WITH due AS (
       UPDATE subscriptions s
          SET renews_at = s.renews_at + interval '1 month'
         FROM plans p
        WHERE p.id = s.plan_id AND s.status = 'active'
          AND p.price_bhd_month > 0 AND s.renews_at <= now()
        RETURNING s.id, s.company_id, p.price_bhd_month AS price
     )
     INSERT INTO payments (user_id, subscription_id, item, method, subtotal_bhd, vat_bhd, total_bhd, status, is_simulated, paid_at)
     SELECT c.user_id, due.id, 'plan',
            COALESCE((SELECT method FROM payments WHERE subscription_id = due.id ORDER BY id DESC LIMIT 1), 'card'),
            due.price, ROUND(due.price * 0.10, 3), due.price + ROUND(due.price * 0.10, 3),
            'paid', true, now()
       FROM due JOIN companies c ON c.id = due.company_id`
  )
  if (rowCount > 0) console.log(`Renewed ${rowCount} plan(s) (simulated)`)
}

// 3 days before renewal: remind the company once
const remindRenewals = async () => {
  await db.query(
    `INSERT INTO notifications (user_id, type, title, message)
     SELECT c.user_id, 'plan',
            p.name || ' plan renews on ' || to_char(s.renews_at, 'DD Mon'),
            'BHD ' || to_char(p.price_bhd_month + ROUND(p.price_bhd_month * 0.10, 3), 'FM990.000')
              || ' will be charged (simulated). You can change your plan from your profile.'
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       JOIN companies c ON c.id = s.company_id
      WHERE s.status = 'active' AND p.price_bhd_month > 0
        AND s.renews_at::date = CURRENT_DATE + 3
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
           WHERE n.user_id = c.user_id AND n.type = 'plan'
             AND n.title LIKE '%renews on%' AND n.created_at > now() - interval '7 days'
        )`
  )
}

const renewPlans = async () => {
  try {
    await renewDuePlans()
    await remindRenewals()
  } catch (err) {
    console.error('Plan renewal failed:', err.message)
  }
}

module.exports = renewPlans
