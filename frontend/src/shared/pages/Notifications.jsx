import { useCallback, useEffect, useState } from 'react'
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
  LockIcon,
  CardIcon,
  BuildingIcon
} from '../components/icons.jsx'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  notificationLink,
  timeAgo,
  announceUnread,
  useOnUnreadChecked
} from '../utils/notifications.js'
import '../styles/Notifications.css'

// Notifications page for both roles (/jobseeker/notifications and /company/notifications).
// Newest first. Clicking one marks it as read and opens its page if it has one.

// Icon for each notification type. Split by role because "deadline" is different for each one.
const TYPE_ICONS = {
  jobseeker: {
    interview: <CalendarIcon />,
    new_matches: <BriefcaseIcon />,
    rejected: <XIcon />,
    accepted: <CheckIcon />,
    cv_ready: <SparkleIcon />,
    deadline: <BriefcaseIcon />,
    shortlisted: <StarIcon />
  },
  company: {
    new_applicants: <PeopleIcon />,
    interview_reply: <CalendarIcon />,
    deadline: <ClockIcon />,
    job_closed: <LockIcon />,
    plan: <CardIcon />,
    account: <BuildingIcon /> // the admin approved / didn't approve the company
  }
}

// Things that are different for the job seeker and the company
const ROLES = {
  jobseeker: {
    signin: '/signin?role=jobseeker',
    emptyText:
      'We will let you know here when a company updates one of your applications.',
    emptyLink: { to: '/jobseeker/jobs', label: 'Find jobs' }
  },
  company: {
    signin: '/signin?role=company',
    emptyText: 'We will let you know here when someone applies to your jobs.',
    emptyLink: { to: '/company/post-job', label: 'Post a job' }
  }
}

// One notification in the list. It is a button only if clicking it does something.
function NotificationItem({ notification, role, onOpen }) {
  const unread = !notification.is_read
  const clickable = unread || notificationLink(notification, role)
  const Tag = clickable ? 'button' : 'div'
  // A reschedule request uses the same type as "interview confirmed", so we check the title to make it red
  const reschedule =
    notification.title === 'Reschedule requested' ? ' nt-item--reschedule' : ''

  return (
    <Tag
      {...(clickable
        ? { type: 'button', onClick: () => onOpen(notification) }
        : {})}
      className={`nt-item nt-item--${notification.type}${reschedule}${unread ? ' nt-item--unread' : ''}${clickable ? ' nt-item--clickable' : ''}`}
    >
      <span className="nt-item__icon" aria-hidden="true">
        {TYPE_ICONS[role]?.[notification.type] || <BellIcon />}
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

export default function Notifications({ role }) {
  const navigate = useNavigate()
  const cfg = ROLES[role]

  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  // Check who is signed in, then load their notifications
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate(cfg.signin, { replace: true })
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
        if (err.error) navigate(cfg.signin, { replace: true })
        else {
          setError('Could not reach the server')
          setLoading(false)
        }
        return
      }
      if (ignore) return

      // Wrong page for this user (a company opened the job seeker page or the opposite), send them to theirs
      const userRole = user.role === 'employer' ? 'company' : 'jobseeker'
      if (userRole !== role) {
        navigate(
          userRole === 'company'
            ? '/company/notifications'
            : '/jobseeker/notifications',
          { replace: true }
        )
        return
      }

      // 2. Load their notifications and the unread count
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
  }, [navigate, reloadKey, role])

  // When the bell finds new notifications, reload the list without showing the spinner
  const refresh = useCallback(() => {
    getNotifications()
      .then((data) => {
        setNotifications(data.notifications)
        setUnread(data.unread)
      })
      .catch(() => {})
  }, [])
  useOnUnreadChecked(refresh)

  // Click on a notification: mark it as read, then open its page if it has one
  async function openNotification(notification) {
    const link = notificationLink(notification, role)
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id)
      } catch (err) {
        setNotice({
          type: 'error',
          text: err.error || 'Could not reach the server'
        })
        return
      }
      const left = Math.max(unread - 1, 0)
      setNotifications((list) =>
        list.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      )
      setUnread(left)
      announceUnread(left)
    }
    if (link) navigate(link)
  }

  // "Mark all as read" button
  async function markAllRead() {
    setBusy(true)
    setNotice(null)
    try {
      await markAllNotificationsRead()
      setNotifications((list) => list.map((n) => ({ ...n, is_read: true })))
      setUnread(0)
      announceUnread(0)
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.error || 'Could not reach the server'
      })
    }
    setBusy(false)
  }

  // What to show under the heading: loading, error, empty, or the list
  let results
  if (loading) {
    results = (
      <ul className="nt-list nt-loading" role="status" aria-label="Loading your notifications">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} aria-hidden="true">
            <div className="nt-item">
              <span className="sk nt-item__icon" />
              <span className="nt-item__body nt-loading__text">
                <span className="sk sk--line" style={{ width: '45%' }} />
                <span className="sk sk--line sk--thin" style={{ width: '85%' }} />
                <span className="sk sk--line sk--thin" style={{ width: 70 }} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    )
  } else if (error) {
    results = (
      <div className="nt-state nt-state--error" role="alert">
        <h3>Could not load your notifications</h3>
        <p>{error}</p>
        <button
          type="button"
          className="btn btn--outline"
          onClick={() => setReloadKey(reloadKey + 1)}
        >
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
        <p>{cfg.emptyText}</p>
        <Link to={cfg.emptyLink.to} className="btn btn--outline">
          {cfg.emptyLink.label}
        </Link>
      </div>
    )
  } else {
    results = (
      <ul className="nt-list">
        {notifications.map((notification) => (
          <li key={notification.id}>
            <NotificationItem
              notification={notification}
              role={role}
              onOpen={openNotification}
            />
          </li>
        ))}
      </ul>
    )
  }

  const ready = !loading && !error

  return (
    <main className={`container nt nt--${role}`}>
      <header className="nt-head">
        <div>
          <h1 className="title">Notifications</h1>
          {ready && (
            <p className="muted">
              {unread ? `${unread} unread` : 'You are all caught up'}
            </p>
          )}
        </div>
        {ready && notifications.length > 0 && (
          <button
            type="button"
            className="btn btn--outline"
            onClick={markAllRead}
            disabled={busy || unread === 0}
          >
            {busy ? 'Marking…' : 'Mark all as read'}
          </button>
        )}
      </header>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      {results}
    </main>
  )
}
