const express = require('express')
const { requireAuth } = require('../middleware/auth')
const NotificationController = require('../controllers/NotificationController')

const router = express.Router()

// GET /api/notifications  (seeker + company)
router.get('/', requireAuth, NotificationController.getNotifications)

// GET /api/notifications/unread-count  → number on the bell
router.get('/unread-count', requireAuth, NotificationController.getUnreadCount)

// PATCH /api/notifications/read-all  → "Mark all as read"
router.patch('/read-all', requireAuth, NotificationController.markAllRead)

// PATCH /api/notifications/:id/read  → clicked one notification
router.patch('/:id/read', requireAuth, NotificationController.markRead)

module.exports = router
