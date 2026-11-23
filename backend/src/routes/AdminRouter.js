const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const AdminController = require('../controllers/AdminController')

const router = express.Router()

// Every route in this file is admin only
router.use(requireAuth, requireRole('admin'))

// GET /api/admin/overview
router.get('/overview', AdminController.getOverview)

// GET /api/admin/seekers
router.get('/seekers', AdminController.getSeekers)

// GET /api/admin/companies
router.get('/companies', AdminController.getCompanies)

module.exports = router
