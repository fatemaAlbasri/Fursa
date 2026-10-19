const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const { upload } = require('../middleware/upload')
const { rateLimit } = require('../middleware/rateLimit')
const CvController = require('../controllers/CvController')

const router = express.Router()

// POST /api/cv/parse  FormData { cv }  (no login, sign up page) → { cv: {...}, source }
router.post('/parse', rateLimit(10, 60), upload.single('cv'), CvController.parse)

// POST /api/cv  FormData { cv }  (logged-in seeker) → new current CV, parsed
router.post('/', requireAuth, requireRole('seeker'), upload.single('cv'), CvController.upload)

// GET /api/cv  (logged-in seeker) → current CV
router.get('/', requireAuth, requireRole('seeker'), CvController.current)

module.exports = router
