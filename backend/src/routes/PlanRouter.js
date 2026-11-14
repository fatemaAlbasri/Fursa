const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const PlanController = require('../controllers/PlanController')

const router = express.Router()
const employer = [requireAuth, requireRole('employer')]

// GET /api/plans  (no login) → the 3 plans with price, VAT and features
router.get('/', PlanController.getPlans)

// GET /api/plans/mine  (company) → current plan + active jobs used
router.get('/mine', employer, PlanController.getMyPlan)

// POST /api/plans/subscribe  { planId, method: 'card', emailReceipt? }  (company)
router.post('/subscribe', employer, PlanController.subscribe)

// GET /api/plans/payments  (signed in) → receipts
router.get('/payments', requireAuth, PlanController.getPayments)

module.exports = router
