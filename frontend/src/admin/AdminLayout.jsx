import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  HomeIcon,
  PeopleIcon,
  BuildingIcon,
  BriefcaseIcon,
  LogOutIcon
} from '../shared/components/icons.jsx'
import Loading from '../shared/components/Loading.jsx'
import { api } from '../shared/api.js'
import { userInitials } from '../shared/utils/jobFormat.js'
import './styles/AdminLayout.css'

// Side menu links. end: true = only active on /admin itself, not on /admin/...
const ADMIN_LINKS = [
  { to: '/admin', label: 'Overview', icon: <HomeIcon />, end: true },
  { to: '/admin/seekers', label: 'Job seekers', icon: <PeopleIcon /> },
  { to: '/admin/companies', label: 'Companies', icon: <BuildingIcon /> },
  { to: '/admin/jobs', label: 'Jobs', icon: <BriefcaseIcon /> }
]

// Every /admin/... page = side menu + the page next to it (<Outlet />)
export default function AdminLayout() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  // Only the admin can stay here. Anyone else (or no token) goes to sign in.
  useEffect(() => {
    api('/auth/me')
      .then(({ user }) => {
        if (user.role === 'admin') setUser(user)
        else navigate('/signin', { replace: true })
      })
      .catch(() => navigate('/signin', { replace: true }))
  }, [navigate])

  // Same as the company/seeker profile: tell the backend, then forget the token
  const logout = async () => {
    await api('/auth/profile/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('token')
    navigate('/')
  }

  if (!user) return <Loading />

  return (
    <div className="admin">
      <aside className="admin__side">
        <NavLink to="/admin" end className="logo logo--light admin__logo">
          <img src="/white-full-logo.png" alt="Fursa" className="logo__full" />
          <span className="logo__tag">Admin</span>
        </NavLink>

        <nav className="admin__nav" aria-label="Admin menu">
          {ADMIN_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                'admin__link' + (isActive ? ' admin__link--active' : '')
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin__me">
          <div className="admin__user">
            <span className="admin__avatar">
              {userInitials(user.first_name, user.last_name)}
            </span>
            <div>
              <div className="admin__name">
                {user.first_name} {user.last_name}
              </div>
              <div className="admin__email">{user.email}</div>
            </div>
          </div>
          <button type="button" className="admin__logout" onClick={logout}>
            <LogOutIcon /> Log out
          </button>
        </div>
      </aside>

      <main className="admin__main">
        <Outlet />
      </main>
    </div>
  )
}