const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const JobController = require('../controllers/JobController')

const router = express.Router()


// GET /api/jobs  (seeker) 
router.get('/', requireAuth, requireRole('seeker'), JobController.getJobs)

// GET /api/jobs/mine  (company)
router.get('/mine', requireAuth, requireRole('employer'), JobController.getCompanyJobs)

// GET /api/jobs/mine/:id  (company) 
router.get('/mine/:id', requireAuth, requireRole('employer'), JobController.getCompanyOneJob)

// GET /api/jobs/mine/:id/applicants  (company)
router.get('/mine/:id/applicants', requireAuth, requireRole('employer'), JobController.getApplicants)

// PATCH /api/jobs/mine/:id/applicants  (company) → shortlist selected
router.patch('/mine/:id/applicants', requireAuth, requireRole('employer'), JobController.updateApplicants)

// GET /api/jobs/:id  (seeker) 
router.get('/:id', requireAuth, requireRole('seeker'), JobController.getOneJob)

// POST /api/jobs  (company)
router.post('/', requireAuth, requireRole('employer'), JobController.createJob)

// PUT /api/jobs/mine/:id  (company)
router.put('/mine/:id', requireAuth, requireRole('employer'), JobController.editJob)

// DELETE /api/jobs/mine/:id  (company)
router.delete('/mine/:id', requireAuth, requireRole('employer'), JobController.deleteJob)

// PATCH /api/jobs/mine/:id/close  (company)
router.patch('/mine/:id/close', requireAuth, requireRole('employer'), JobController.closeJob)



module.exports = router
