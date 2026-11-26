import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { BellIcon } from './icons.jsx';

// Shared top menu. `links` = [{ to, label }] or [{ href: "#section", label }], `tag` = small label after the logo (e.g. "Employer"),
// `right` = anything shown on the right side (sign-in link, back button, profile...).
// A link can also have `icon` (an icon from icons.jsx) and `soon: true` = page not built yet:
// it is shown in the menu but can't be clicked.
// On small screens the links go inside a menu button.
// menuExtra = extra stuff to show at the bottom of that menu (used for the sign in buttons on phones)
// home = where the logo goes (the landing page unless given)
export default function Navbar({ tag, links = [], right, menuExtra, home = '/' }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]); // close menu when page changes

  // scrolling down hides the bar, scrolling up brings it back
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 6) return; // ignore tiny moves
      setHidden(y > lastY && y > 80); // stays visible near the top
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // teal pill behind the open page's link; it slides to the new link when the page changes
  const navRef = useRef(null);
  const [pill, setPill] = useState(null); // { left, width } or null = no pill
  useLayoutEffect(() => {
    const place = () => {
      const nav = navRef.current;
      const active = nav?.querySelector('.topbar__link--active');
      // no open link, or the ☰ menu layout (links under each other) → no sliding pill
      if (!active || getComputedStyle(nav).flexDirection === 'column') return setPill(null);
      setPill({ left: active.offsetLeft, width: active.offsetWidth });
    };
    place();
    document.fonts?.ready.then(place); // widths change once the font has loaded
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [pathname, links.length]);

  let headerClass = links.length > 0 ? 'topbar topbar--nav' : 'topbar';
  if (open) headerClass += ' topbar--open';
  else if (hidden) headerClass += ' topbar--hidden'; // never hide while the ☰ menu is open

  return (
    <header className={headerClass}>
      <Link to={home} className="logo logo--light">
        <img src="/white-full-logo.png" alt="Fursa" className="logo__full" />
        {tag && <span className="logo__tag">{tag}</span>}
      </Link>

      {links.length > 0 && (
        <nav
          id="topbar-menu"
          ref={navRef}
          className={pill ? 'topbar__nav topbar__nav--pill' : 'topbar__nav'}
          onClick={() => setOpen(false)}
        >
          {pill && (
            <span
              className="topbar__pill"
              style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
              aria-hidden="true"
            />
          )}
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
