import { Link, NavLink } from 'react-router-dom';
import './CompanyNavbar.css';

// Top bar for every company (employer) page.
// unread = number of new notifications (from the backend later)
export default function CompanyNavbar({ companyInitial = 'A', unread = 3 }) {
  const linkClass = ({ isActive }) => (isActive ? 'cnav__link cnav__link--active' : 'cnav__link');

  return (
    <header className="cnav">
      <div className="cnav__inner">
        <Link to="/company/jobs" className="logo">
          <img src="/fursa-key.png" alt="" className="logo__key" />
          <img src="/fursa-wordmark-white.png" alt="Fursa" className="logo__wordmark" />
          <span className="logo__tag">Employer</span>
        </Link>

        <nav className="cnav__menu" aria-label="Employer menu">
          <NavLink to="/company/jobs" className={linkClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V4h6v3" />
            </svg>
            Jobs
          </NavLink>
          <NavLink to="/company/applicants" className={linkClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
              <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2.4.6 4 2.4 4 5.5" />
            </svg>
            Applicants
          </NavLink>
          <NavLink to="/company/post-job" className={linkClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Post a job
          </NavLink>
        </nav>

        <div className="cnav__right">
          <NavLink to="/company/notifications" className="cnav__bell"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unread > 0 && <span className="cnav__badge">{unread > 9 ? '9+' : unread}</span>}
          </NavLink>

          <NavLink to="/company/profile" className="cnav__profile">
            <span className="cnav__avatar">{companyInitial}</span>
            Profile
          </NavLink>
        </div>
      </div>
    </header>
  );
}