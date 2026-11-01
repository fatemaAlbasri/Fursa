const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const CompanyController = require('../controllers/CompanyController')

const router = express.Router()


// GET /api/companies  (seeker)
router.get('/', requireAuth, requireRole('seeker'), CompanyController.getCompanies)

// GET /api/companies/:id  (seeker)
router.get('/:id', requireAuth, requireRole('seeker'), CompanyController.getOneCompany)


module.exports = router
