const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const AdminController = require('../controllers/AdminController')

const router = express.Router()

// Every route in this file is admin only
router.use(requireAuth, requireRole('admin'))

// GET /api/admin/overview 
router.get('/overview', AdminController.getOverview)

module.exports = router