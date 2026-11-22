import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { BellIcon } from './icons.jsx';

// Shared top menu. `links` = [{ to, label }] or [{ href: "#section", label }], `tag` = small label after the logo (e.g. "Employer"),
// `right` = anything shown on the right side (sign-in link, back button, profile...).
// A link can also have `icon` (an icon from icons.jsx) and `soon: true` = page not built yet:
// it is shown in the menu but can't be clicked.
// On tablets and phones the links fold into a ☰ menu. `menuExtra` = shown at the bottom of
// that menu on phones (e.g. the landing page's Sign in / Create account, hidden from the bar there).
export default function Navbar({ tag, links = [], right, menuExtra }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]); // close the menu after moving to another page

  let headerClass = links.length > 0 ? 'topbar topbar--nav' : 'topbar';
  if (open) headerClass += ' topbar--open';

  return (
    <header className={headerClass}>
      <Link to="/" className="logo logo--light">
        <img src="/white-full-logo.png" alt="Fursa" className="logo__full" />
        {tag && <span className="logo__tag">{tag}</span>}
      </Link>

      {links.length > 0 && (
        <nav id="topbar-menu" className="topbar__nav" onClick={() => setOpen(false)}>
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
          {menuExtra && <div className="topbar__menu-extra">{menuExtra}</div>}
        </nav>
      )}

      {right && <span className="topbar__right">{right}</span>}

      {links.length > 0 && (
        <button type="button" className="topbar__toggle"
          aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="topbar-menu"
          onClick={() => setOpen((o) => !o)}>
          <span /><span /><span />
        </button>
      )}
    </header>
  );
}

// Right side for signed-in pages: notifications bell + round avatar with "Profile".
// `avatar` = what goes in the circle, e.g. the user's initials.
// `bell` = a working bell (e.g. the job seeker's NotificationBell); without it the bell is visual only.
// `to` = the profile page's path: "Profile" becomes a link (teal while that page is open).
// Without `to` it is visual only and can't be clicked.
export function NavbarAccount({ avatar, bell, to }) {
  const content = (
    <>
      <span className="topbar__avatar">{avatar}</span>
      Profile
    </>
  );
  return (
    <span className="topbar__account">
      {bell || (
        <span className="topbar__bell" aria-disabled="true" role="img" aria-label="Notifications (coming soon)"
          title="Notifications — coming soon">
          <BellIcon />
        </span>
      )}
      {to ? (
        <NavLink to={to}
          className={({ isActive }) => (isActive ? 'topbar__profile topbar__profile--link topbar__profile--active' : 'topbar__profile topbar__profile--link')}>
          {content}
        </NavLink>
      ) : (
        <span className="topbar__profile" aria-disabled="true" title="Profile — coming soon">
          {content}
        </span>
      )}
    </span>
  );
}
