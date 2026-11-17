import { NavLink } from 'react-router-dom'
import { BellIcon } from './icons.jsx'
import { useUnreadCount } from '../utils/notifications.js'

// Bell in the top bar for both roles. to = that role's Notifications page.
export default function NotificationBell({to}) {
  const unread = useUnreadCount()
  return (
    <NavLink
      to={to}
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
