const { listSkills } = require('../services/skills')

// GET /api/skills → skill names for every skills dropdown (public, sign up needs it)
const getSkills = async (req, res, next) => {
  try {
    res.json({ skills: await listSkills() })
  } catch (err) {
    next(err)
  }
}

module.exports = { getSkills }
