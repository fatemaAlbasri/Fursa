const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const JobController = require('../controllers/JobController')

const router = express.Router()


// GET /api/jobs  (seeker) → all open jobs
router.get('/', requireAuth, requireRole('seeker'), JobController.list)

// GET /api/jobs/mine  (company)
router.get('/mine', requireAuth, requireRole('employer'), JobController.mine)


module.exports = router
