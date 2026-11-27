const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const { upload } = require('../middleware/upload')
const ProfileController = require('../controllers/ProfileController')

const router = express.Router()
const seeker = [requireAuth, requireRole('seeker')]
const employer = [requireAuth, requireRole('employer')]

// GET /api/profile  (seeker + company) 
router.get('/', requireAuth, ProfileController.getProfile)

// Seeker: one route per "Edit" button on the profile page
router.put('/seeker/details', seeker, ProfileController.updateSeekerDetails)
router.put('/seeker/skills', seeker, ProfileController.updateSeekerSkills)
router.put('/seeker/preferences', seeker, ProfileController.updateSeekerPreferences)

// Company
router.put('/company/details', employer, ProfileController.updateCompanyDetails)
router.put('/company/logo', employer, upload.single('logo'), ProfileController.updateCompanyLogo)
router.delete('/company/logo', employer, ProfileController.removeCompanyLogo)
router.put('/company/contact', employer, ProfileController.updateCompanyContact)

// PUT /api/profile/company/review  { crNumber, note? } → a rejected company fixes its CR number and asks again
router.put('/company/review', employer, ProfileController.resubmitCompany)

module.exports = router
