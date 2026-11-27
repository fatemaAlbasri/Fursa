const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const AdminController = require('../controllers/AdminController')
const JobController = require('../controllers/JobController')

const router = express.Router()

// Every route in this file is admin only
router.use(requireAuth, requireRole('admin'))

// GET /api/admin/overview
router.get('/overview', AdminController.getOverview)

// GET /api/admin/report?period=month|3months|year → Overview numbers as a PDF download
router.get('/report', AdminController.downloadReport)

// GET /api/admin/seekers
router.get('/seekers', AdminController.getSeekers)

// GET /api/admin/companies
router.get('/companies', AdminController.getCompanies)

// GET /api/admin/jobs
router.get('/jobs', AdminController.getJobs)

// GET /api/admin/jobs/:id 
router.get('/jobs/:id', JobController.getAdminOneJob)

module.exports = router
