const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const { upload } = require('../middleware/upload')
const { rateLimit } = require('../middleware/rateLimit')
const CvController = require('../controllers/CvController')
const CvOptimizerController = require('../controllers/CvOptimizerController')

const router = express.Router()

// POST /api/cv/parse  FormData { cv }  (no login, sign up page) → { cv: {...}, source }
router.post('/parse', rateLimit(10, 60), upload.single('cv'), CvController.parse)

// POST /api/cv  FormData { cv }  (logged-in seeker) → new current CV, parsed
router.post('/', requireAuth, requireRole('seeker'), upload.single('cv'), CvController.upload)

// GET /api/cv  (logged-in seeker) → current CV
router.get('/', requireAuth, requireRole('seeker'), CvController.current)

// AI CV Optimizer (logged-in seeker, always about the current CV)
const seeker = [requireAuth, requireRole('seeker')]

// GET /api/cv/optimizer → { review, canReview } (review is null until the CV has been reviewed)
router.get('/optimizer', seeker, CvOptimizerController.getReview)

// POST /api/cv/optimizer → reviews the CV with AI (a CV is only reviewed once)
router.post('/optimizer', seeker, rateLimit(10, 60), CvOptimizerController.createReview)

// POST /api/cv/optimizer/unlock  { method } → simulated payment, unlocks the advanced report
router.post('/optimizer/unlock', seeker, CvOptimizerController.unlock)

// PATCH /api/cv/optimizer/suggestions/:id  { status } → pending / accepted / dismissed
router.patch('/optimizer/suggestions/:id', seeker, CvOptimizerController.updateSuggestion)

// GET /api/cv/optimizer/improved-cv → PDF of the CV with the accepted suggestions
router.get('/optimizer/improved-cv', seeker, CvOptimizerController.downloadCv)

// GET /api/cv/optimizer/report → PDF of the full report (after unlocking)
router.get('/optimizer/report', seeker, CvOptimizerController.downloadReport)

module.exports = router
