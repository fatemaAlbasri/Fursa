const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

// POST /api/auth/signup  
router.post(
  '/signup',
  upload.fields([{ name: 'cv', maxCount: 1 }, { name: 'logo', maxCount: 1 }]),
  AuthController.signup
);

// POST /api/auth/signin  
router.post('/signin', AuthController.signin);

// GET /api/auth/me  
router.get('/me', requireAuth, AuthController.me);

// POST /api/auth/forgot-password  { email }  → emails a reset link
router.post('/forgot-password', AuthController.forgotPassword);

// POST /api/auth/reset-password  { token, password }  (token from the reset link)
router.post('/reset-password', AuthController.resetPassword);

// PUT /api/auth/change-password  { currentPassword, newPassword }  (logged in)
router.put('/change-password', requireAuth, AuthController.changePassword);

// DELETE /api/auth/account  { password }  (logged in)
router.delete('/account', requireAuth, AuthController.deleteAccount);

module.exports = router;
