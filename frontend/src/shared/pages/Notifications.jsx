import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import Notice from '../components/Notice.jsx'
import {
  CalendarIcon,
  BriefcaseIcon,
  XIcon,
  CheckIcon,
  SparkleIcon,
  StarIcon,
  BellIcon,
  PeopleIcon,
  ClockIcon,
  ListIcon,
  CardIcon,
} from '../components/icons.jsx'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  notificationLink,
  timeAgo,
  announceUnread
} from '../utils/notifications.js'
import '../styles/Notifications.css'

// =====================================================================
// Notifications (/jobseeker/notifications).
// Newest first; unread ones are tinted with a dot. Clicking one marks it as read and opens its page
// (an application, a job, the CV optimizer) — or stays here when it has no page.
// Data: GET /api/notifications → { notifications, unread }.
// =====================================================================

// Same type can mean different things per role (deadline), so icons are per role
const TYPE_ICONS = {
  jobseeker:{
    interview: <CalendarIcon />,
    new_matches: <BriefcaseIcon />,
    rejected: <XIcon />,
    accepted: <CheckIcon />,
    cv_ready: <SparkleIcon />,
    deadline: <BriefcaseIcon />,
    shortlisted: <StarIcon />
  },
  company:{
    new_applicants: <PeopleIcon />,
    interview_reply: <CalendarIcon />,
    deadline: <ClockIcon />,
    job_closed: <ListIcon />,
    plan: <CardIcon />
  }
}

// One row. Unread rows and rows with a page are buttons; a read row with no page is plain text.
function NotificationItem({ notification, onOpen }) {
  const unread = !notification.is_read
  const clickable = unread || notificationLink(notification)
  const Tag = clickable ? 'button' : 'div'

  return (
    <Tag
      {...(clickable ? { type: 'button', onClick: () => onOpen(notification) } : {})}
      className={`nt-item nt-item--${notification.type}${unread ? ' nt-item--unread' : ''}${clickable ? ' nt-item--clickable' : ''}`}
    >
      <span className="nt-item__icon" aria-hidden="true">
        {TYPE_ICONS[notification.type] || <BellIcon />}
      </span>
      <span className="nt-item__body">
        <strong className="nt-item__title">{notification.title}</strong>
        <span className="nt-item__message">{notification.message}</span>
        <time className="nt-item__time" dateTime={notification.created_at}>
          {timeAgo(notification.created_at)}
        </time>
      </span>
      {unread && (
        <span className="nt-item__dot">
          <span className="nt-sr">Unread</span>
        </span>
      )}
    </Tag>
  )
}

export default function Notifications() {
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0) // "Try again" bumps this to load again
  const [busy, setBusy] = useState(false) // "Mark all as read" is running
  const [notice, setNotice] = useState(null)

  // Load the signed-in user, then their notifications. No token or a bad token → Sign In; a company → its own home.
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/signin?role=jobseeker', { replace: true })
      return
    }
    let ignore = false // stops a late answer from updating the page after leaving it

    async function load() {
      setLoading(true)
      setError('')

      // 1. Who is signed in?
      let user
      try {
        const data = await api('/auth/me')
        user = data.user
      } catch (err) {
        if (ignore) return
        if (err.error) navigate('/signin?role=jobseeker', { replace: true })
        else {
          setError('Could not reach the server')
          setLoading(false)
        }
        return
      }
      if (ignore) return
      if (user.role === 'employer') {
        navigate('/company', { replace: true })
        return
      }

      // 2. Their notifications (newest first) + how many are unread
      try {
        const data = await getNotifications()
        if (!ignore) {
          setNotifications(data.notifications)
          setUnread(data.unread)
          announceUnread(data.unread)
        }
      } catch (err) {
        if (!ignore) setError(err.error || 'Could not reach the server')
      }
      if (!ignore) setLoading(false)
    }
    load()

    return () => {
      ignore = true
    }
  }, [navigate, reloadKey])

  // Clicked one: mark it as read (if it isn't), then open its page if it has one
  async function openNotification(notification) {
    const link = notificationLink(notification)
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id)
      } catch (err) {
        setNotice({ type: 'error', text: err.error || 'Could not reach the server' })
        return
      }
      const left = Math.max(unread - 1, 0)
      setNotifications((list) => list.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)))
      setUnread(left)
      announceUnread(left)
    }
    if (link) navigate(link)
  }

  async function markAllRead() {
    setBusy(true)
    setNotice(null)
    try {
      await markAllNotificationsRead()
      setNotifications((list) => list.map((n) => ({ ...n, is_read: true })))
      setUnread(0)
      announceUnread(0)
    } catch (err) {
      setNotice({ type: 'error', text: err.error || 'Could not reach the server' })
    }
    setBusy(false)
  }

  // ---------- What goes under the heading
  let results
  if (loading) {
    results = (
      <div className="nt-state" role="status">
        <span className="nt-spinner" aria-hidden="true" />
        Loading your notifications…
      </div>
    )
  } else if (error) {
    results = (
      <div className="nt-state nt-state--error" role="alert">
        <h3>Could not load your notifications</h3>
        <p>{error}</p>
        <button type="button" className="btn btn--outline" onClick={() => setReloadKey(reloadKey + 1)}>
          Try again
        </button>
      </div>
    )
  } else if (notifications.length === 0) {
    results = (
      <div className="nt-state">
        <span className="nt-state__icon" aria-hidden="true">
          <BellIcon />
        </span>
        <h3>No notifications yet</h3>
        <p>We will let you know here when a company updates one of your applications.</p>
        <Link to="/jobseeker/jobs" className="btn btn--outline">
          Find jobs
        </Link>
      </div>
    )
  } else {
    results = (
      <ul className="nt-list">
        {notifications.map((notification) => (
          <li key={notification.id}>
            <NotificationItem notification={notification} onOpen={openNotification} />
          </li>
        ))}
      </ul>
    )
  }

  const ready = !loading && !error

  return (
    <main className="container nt">
      <header className="nt-head">
        <div>
          <h1 className="title">Notifications</h1>
          {ready && <p className="muted">{unread} unread</p>}
        </div>
        {ready && notifications.length > 0 && (
          <button type="button" className="btn btn--outline" onClick={markAllRead} disabled={busy || unread === 0}>
            {busy ? 'Marking…' : 'Mark all as read'}
          </button>
        )}
      </header>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      {results}
    </main>
  )
}
