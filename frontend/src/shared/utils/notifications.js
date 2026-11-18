// Notification helpers used by the Notifications page and the bell (both roles).

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api.js'
import { formatShortDate } from '../../jobseeker/utils/applicationFormat.js'

// API
export const getNotifications = () => api('/notifications')
export const markNotificationRead = (id) => api(`/notifications/${id}/read`, { method: 'PATCH' })
export const markAllNotificationsRead = () => api('/notifications/read-all', { method: 'PATCH' })

// Page to open when a notification is clicked (null = nothing to open)
export function notificationLink(notification, role) {
  const { type, application_id, job_id } = notification
  if (role === 'company'){
    if (type === 'new_applicants') return '/company/applicants'
    if (type === 'interview_reply') return `/company/jobs/${job_id}/applicants/${application_id}`
    if (job_id) return `/company/jobs/${job_id}`
    if (type === 'plan') return '/company/profile'
    return null
    }
  if (type === 'new_matches') return '/jobseeker/jobs'
  if (type === 'cv_ready') return '/jobseeker/cv-optimizer'
  if (application_id) return `/jobseeker/applications/${application_id}`
  if (job_id) return `/jobseeker/jobs/${job_id}`
  return null
}

// "2 hours ago", "Yesterday", "11 Oct"
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'} ago`

// Days between two dates, ignoring the time
const daysBetween = (from, to) =>
  Math.round(
    (new Date(to.getFullYear(), to.getMonth(), to.getDate()) -
      new Date(from.getFullYear(), from.getMonth(), from.getDate())) / (24 * HOUR)
  )

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

// Unread count
// The bell keeps the count. The Notifications page tells it when the user reads something,
// and the bell tells the page when it checked the server, so both stay up to date.
const UNREAD_EVENT = 'fursa:notifications-unread'
const CHECKED_EVENT = 'fursa:notifications-checked'
const CHECK_EVERY = 30 * 1000

export const announceUnread = (count) =>
  window.dispatchEvent(new CustomEvent(UNREAD_EVENT, { detail: count }))

export function useOnUnreadChecked(callback) {
  useEffect(() => {
    window.addEventListener(CHECKED_EVENT, callback)
    return () => window.removeEventListener(CHECKED_EVENT, callback)
  }, [callback])
}

// Checks again on page change, after the user changes something, when the tab is focused, and every 30s
export function useUnreadCount() {
  const [unread, setUnread] = useState(0)
  const { pathname } = useLocation()

  const load = () => {
    if (!localStorage.getItem('token') || document.hidden) return
    api('/notifications/unread-count')
      .then((data) => {
        setUnread(data.unread)
        window.dispatchEvent(new Event(CHECKED_EVENT))
      })
      .catch(() => setUnread(0))
  }

  useEffect(load, [pathname])

  useEffect(() => {
    const update = (e) => setUnread(e.detail)
    window.addEventListener(UNREAD_EVENT, update)
    window.addEventListener('fursa:data-changed', load)
    window.addEventListener('focus', load)
    const timer = setInterval(load, CHECK_EVERY)
    return () => {
      window.removeEventListener(UNREAD_EVENT, update)
      window.removeEventListener('fursa:data-changed', load)
      window.removeEventListener('focus', load)
      clearInterval(timer)
    }
  }, [])

  return unread
}
