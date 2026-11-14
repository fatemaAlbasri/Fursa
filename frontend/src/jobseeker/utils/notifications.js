// =====================================================================
// Notification helpers for the job seeker.
// Used by: the Notifications page and the bell in the top bar (unread badge).
// Data: GET /api/notifications → { notifications, unread }, GET /api/notifications/unread-count → { unread },
//       PATCH /api/notifications/:id/read, PATCH /api/notifications/read-all → { unread: 0 }.
// =====================================================================
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../../shared/api.js'
import { formatShortDate } from './applicationFormat.js'

// ---------- API ----------
export const getNotifications = () => api('/notifications')
export const markNotificationRead = (id) => api(`/notifications/${id}/read`, { method: 'PATCH' })
export const markAllNotificationsRead = () => api('/notifications/read-all', { method: 'PATCH' })

// ---------- Where a notification opens ----------
// Only pages that already exist. null = no page for it → it is just marked as read.
export function notificationLink(notification) {
  const { type, application_id, job_id } = notification
  if (type === 'new_matches') return '/jobseeker/jobs'
  if (type === 'cv_ready') return '/jobseeker/cv-optimizer'
  if (application_id) return `/jobseeker/applications/${application_id}`
  if (job_id) return `/jobseeker/jobs/${job_id}`
  return null
}

// ---------- "2 hours ago" ----------
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'} ago`

// Calendar days between two dates (local time), so "Yesterday" means the day before today
const daysBetween = (from, to) =>
  Math.round(
    (new Date(to.getFullYear(), to.getMonth(), to.getDate()) -
      new Date(from.getFullYear(), from.getMonth(), from.getDate())) / (24 * HOUR)
  )

// → "Just now", "5 minutes ago", "2 hours ago", "Yesterday", "3 days ago", then "11 Oct" (+ year if not this year)
export function timeAgo(value, now = new Date()) {
  const date = new Date(value)
  if (!value || isNaN(date)) return ''
  const diff = now - date
  if (diff < MINUTE) return 'Just now'
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), 'minute')
  if (diff < 24 * HOUR) return plural(Math.floor(diff / HOUR), 'hour')
  const days = daysBetween(date, now)
  if (days <= 1) return 'Yesterday'
  if (days < 7) return plural(days, 'day')
  const short = formatShortDate(date)
  return date.getFullYear() === now.getFullYear() ? short : `${short} ${date.getFullYear()}`
}

// ---------- Unread count for the bell ----------
// The page announces the new count after "mark as read" so the bell badge changes straight away.
const UNREAD_EVENT = 'fursa:notifications-unread'

export const announceUnread = (count) =>
  window.dispatchEvent(new CustomEvent(UNREAD_EVENT, { detail: count }))

// Unread count for the signed-in user. Reloaded on every page change; 0 if signed out or on error.
export function useUnreadCount() {
  const [unread, setUnread] = useState(0)
  const { pathname } = useLocation()

  useEffect(() => {
    let active = true
    if (localStorage.getItem('token')) {
      api('/notifications/unread-count')
        .then((data) => active && setUnread(data.unread))
        .catch(() => active && setUnread(0))
    }
    return () => {
      active = false
    }
  }, [pathname])

  useEffect(() => {
    const update = (e) => setUnread(e.detail)
    window.addEventListener(UNREAD_EVENT, update)
    return () => window.removeEventListener(UNREAD_EVENT, update)
  }, [])

  return unread
}
