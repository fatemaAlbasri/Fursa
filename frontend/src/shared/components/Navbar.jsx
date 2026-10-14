import { Link, NavLink } from 'react-router-dom';

// Shared top menu. `links` = [{ to, label }], `tag` = small label after the logo (e.g. "Employer"),
// `right` = anything shown on the right side (sign-in link, back button, profile...).
export default function Navbar({ tag, links = [], right }) {
  return (
    <header className="topbar">
      <Link to="/" className="logo logo--light">
        <img src="/logo.svg" alt="" className="logo__img" />
        <span className="logo__text">Fursa</span>
        {tag && <span className="logo__tag">{tag}</span>}
      </Link>

      {links.length > 0 && (
        <nav className="topbar__nav">
          {links.map((l) => (
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
