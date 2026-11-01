import { useEffect, useState } from 'react'
import { api } from '../../shared/api.js'
import { userInitials } from '../../shared/utils/jobFormat.js'

// "FA" for the avatar circle in the shared Navbar (<NavbarAccount avatar={<UserInitials />} />).
// The circle itself is styled by the Navbar (.topbar__avatar in index.css).
export default function UserInitials() {
  const [user, setUser] = useState(null)

  // Ask the backend who is signed in. Signing in / out is handled by the page itself,
  // so here any problem just means "show nothing".
  useEffect(() => {
    if (!localStorage.getItem('token')) return
    let ignore = false // stops a late answer from updating after leaving the page
    api('/auth/me')
      .then((data) => {
        if (!ignore) setUser(data.user)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [])

  // Still loading, not signed in, or no name → nothing to show
  const initials = user ? userInitials(user.first_name, user.last_name) : ''
  if (!initials) return null

  const fullName = `${user.first_name} ${user.last_name}`
  return (
    <span title={fullName} aria-label={`Signed in as ${fullName}`}>
      {initials}
    </span>
  )
}
