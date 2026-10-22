const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const JobController = require('../controllers/JobController')

const router = express.Router()


// GET /api/jobs  (seeker) 
router.get('/', requireAuth, requireRole('seeker'), JobController.list)

// GET /api/jobs/mine  (company)
router.get('/mine', requireAuth, requireRole('employer'), JobController.mine)

// GET /api/jobs/mine/:id  (company) 
router.get('/mine/:id', requireAuth, requireRole('employer'), JobController.companyOneJob)

// GET /api/jobs/:id  (seeker) 
router.get('/:id', requireAuth, requireRole('seeker'), JobController.oneJob)



module.exports = router
