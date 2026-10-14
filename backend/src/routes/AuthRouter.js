const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

// POST /api/auth/signup  (multipart/form-data or JSON)
router.post(
  '/signup',
  upload.fields([{ name: 'cv', maxCount: 1 }, { name: 'logo', maxCount: 1 }]),
  AuthController.signup
);

// POST /api/auth/signin  { email, password, role? }
router.post('/signin', AuthController.signin);

// GET /api/auth/me  → the logged-in user (frontend calls this on page load)
router.get('/me', requireAuth, AuthController.me);

module.exports = router;
