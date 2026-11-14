import { Link, NavLink } from 'react-router-dom';
import { BellIcon } from './icons.jsx';

// Shared top menu. `links` = [{ to, label }] or [{ href: "#section", label }], `tag` = small label after the logo (e.g. "Employer"),
// `right` = anything shown on the right side (sign-in link, back button, profile...).
// A link can also have `icon` (an icon from icons.jsx) and `soon: true` = page not built yet:
// it is shown in the menu but can't be clicked.
export default function Navbar({ tag, links = [], right }) {
  return (
    <header className={links.length > 0 ? 'topbar topbar--nav' : 'topbar'}>
      <Link to="/" className="logo logo--light">
        <img src="/white-full-logo.png" alt="Fursa" className="logo__full" />
        {tag && <span className="logo__tag">{tag}</span>}
      </Link>

      {links.length > 0 && (
        <nav className="topbar__nav">
          {links.map((l) => l.soon ? (
            <span key={l.label} className="topbar__link topbar__link--soon" aria-disabled="true" title="Coming soon">
              {l.icon}{l.label}
            </span>
          ) : l.href ? (
            // in-page anchor (e.g. landing sections) — NavLink would mark every hash link active
            <a key={l.href} href={l.href} className="topbar__link">{l.icon}{l.label}</a>
          ) : (
            // NavLink stays active on its sub-pages too (Jobs for you → All jobs, a job's details)
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => (isActive ? 'topbar__link topbar__link--active' : 'topbar__link')}>
              {l.icon}{l.label}
            </NavLink>
          ))}
        </nav>
      )}

      {right && <span className="topbar__right">{right}</span>}
    </header>
  );
}

// Right side for signed-in pages: notifications bell + round avatar with "Profile".
// `avatar` = what goes in the circle, e.g. the user's initials.
// `bell` = a working bell (e.g. the job seeker's NotificationBell); without it the bell is visual only.
// Profile is visual only for now (no profile page yet), so it can't be clicked.
export function NavbarAccount({ avatar, bell }) {
  return (
    <span className="topbar__account">
      {bell || (
        <span className="topbar__bell" aria-disabled="true" role="img" aria-label="Notifications (coming soon)"
          title="Notifications — coming soon">
          <BellIcon />
        </span>
      )}
      <span className="topbar__profile" aria-disabled="true" title="Profile — coming soon">
        <span className="topbar__avatar">{avatar}</span>
        Profile
      </span>
    </span>
  );
}
