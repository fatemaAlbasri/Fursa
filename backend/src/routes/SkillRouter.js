const express = require('express')
const SkillController = require('../controllers/SkillController')

const router = express.Router()

// GET /api/skills  (public)
router.get('/', SkillController.getSkills)

module.exports = router
