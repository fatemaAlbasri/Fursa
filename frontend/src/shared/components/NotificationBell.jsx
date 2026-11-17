import { NavLink } from 'react-router-dom'
import { BellIcon } from './icons.jsx'
import { useUnreadCount } from '../utils/notifications.js'

// Bell in the job seeker top bar (<NavbarAccount bell={<NotificationBell />} />).
// Opens Notifications; red badge = unread count (9+ when more). Teal while on the Notifications page.
// Styled by the Navbar (.topbar__bell, .topbar__badge in index.css).
export default function NotificationBell() {
  const unread = useUnreadCount()

  return (
    <NavLink
      to="/jobseeker/notifications"
      className={({ isActive }) => `topbar__bell topbar__bell--link${isActive ? ' topbar__bell--active' : ''}`}
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
    >
      <BellIcon />
      {unread > 0 && (
        <span className="topbar__badge" aria-hidden="true">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </NavLink>
  )
}
