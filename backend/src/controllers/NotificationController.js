const db = require('../config/db')

const parseId = (req) => {
  const id = Number(req.params.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

const countUnread = async (userId) => {
  const { rows } = await db.query(
    'SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id = $1 AND NOT is_read',
    [userId]
  )
  return rows[0].unread
}

// GET /api/notifications → the notifications page (newest first) + unread count
const getNotifications = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, type, title, message, is_read, created_at, application_id, job_id
         FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 50`,
      [req.user.id]
    )
    res.json({ notifications: rows, unread: await countUnread(req.user.id) })
  } catch (err) {
    next(err)
  }
}

// GET /api/notifications/unread-count → just the number on the bell
const getUnreadCount = async (req, res, next) => {
  try {
    res.json({ unread: await countUnread(req.user.id) })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/notifications/:id/read → when the user clicks one
const markRead = async (req, res, next) => {
  try {
    const id = parseId(req)
    if (!id) return res.status(400).json({ error: 'Invalid notification id' })

    // user_id in the WHERE: nobody can mark someone else's notification
    const { rowCount } = await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )
    if (rowCount === 0) return res.status(404).json({ error: 'Notification not found' })
    res.json({ id, is_read: true })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/notifications/read-all → the "Mark all as read" button
const markAllRead = async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND NOT is_read',
      [req.user.id]
    )
    res.json({ updated: rowCount, unread: 0 })
  } catch (err) {
    next(err)
  }
}

module.exports = { getNotifications, getUnreadCount, markRead, markAllRead }
