const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const ApplicationController = require('../controllers/ApplicationController')

const router = express.Router()
const seeker = [requireAuth, requireRole('seeker')]

// GET /api/applications  (seeker) → My applications: every application + counts per status
router.get('/', seeker, ApplicationController.getMyApplications)

// GET /api/applications/:id  (seeker) → one application: timeline, interview, feedback
router.get('/:id', seeker, ApplicationController.getMyApplication)

// PATCH /api/applications/:id/interview  { action: 'confirm' | 'reschedule', message? }  (seeker)
router.patch('/:id/interview', seeker, ApplicationController.replyToInterview)

module.exports = router
