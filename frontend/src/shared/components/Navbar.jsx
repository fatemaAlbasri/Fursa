import { Link, NavLink } from 'react-router-dom';

// Shared top menu. `links` = [{ to, label }] or [{ href: "#section", label }], `tag` = small label after the logo (e.g. "Employer"),
// `right` = anything shown on the right side (sign-in link, back button, profile...).
export default function Navbar({ tag, links = [], right }) {
  return (
    <header className={links.length > 0 ? 'topbar topbar--nav' : 'topbar'}>
      <Link to="/" className="logo logo--light">
        <img src="/white-full-logo.png" alt="Fursa" className="logo__full" />
        {tag && <span className="logo__tag">{tag}</span>}
      </Link>

      {links.length > 0 && (
        <nav className="topbar__nav">
          {links.map((l) => l.href ? (
            // in-page anchor (e.g. landing sections) — NavLink would mark every hash link active
            <a key={l.href} href={l.href} className="topbar__link">{l.label}</a>
          ) : (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => (isActive ? 'topbar__link topbar__link--active' : 'topbar__link')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      )}

      {right && <span className="topbar__right">{right}</span>}
    </header>
  );
}
