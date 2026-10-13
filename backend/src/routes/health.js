const express = require('express');
const db = require('../config/db');

const router = express.Router();

// GET /api/health → checks the server and the database connection
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() AS now');
    res.json({ status: 'ok', database: 'connected', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', message: err.message });
  }
});

module.exports = router;
