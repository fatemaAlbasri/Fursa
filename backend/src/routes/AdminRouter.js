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

// Company verification: new companies wait as 'pending' until the admin decides
// PATCH /api/admin/companies/:id/approve
router.patch('/companies/:id/approve', AdminController.approveCompany)
// PATCH /api/admin/companies/:id/reject  { reason }
router.patch('/companies/:id/reject', AdminController.rejectCompany)

// CSV downloads: same tab + search as the list, every row
// GET /api/admin/seekers/export?tab=&q=
router.get('/seekers/export', AdminController.exportSeekers)
// GET /api/admin/companies/export?plan=&q=
router.get('/companies/export', AdminController.exportCompanies)
// GET /api/admin/jobs/export?status=&q=   (before /jobs/:id so "export" isn't read as an id)
router.get('/jobs/export', AdminController.exportJobs)

// GET /api/admin/jobs/:id 
router.get('/jobs/:id', JobController.getAdminOneJob)

module.exports = router
