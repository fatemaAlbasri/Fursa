import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar, { NavbarAccount } from '../shared/components/Navbar.jsx';
import NotificationBell from '../shared/components/NotificationBell.jsx';
import { BriefcaseIcon, PeopleIcon, PlusIcon } from '../shared/components/icons.jsx';
import { api } from '../shared/api.js';
import { companyInitial } from '../shared/utils/jobFormat.js';
import './styles/CompanyLayout.css';

// top bar with the company's links
const COMPANY_LINKS = [
  { to: '/company/jobs', label: 'Jobs', icon: <BriefcaseIcon /> },
  { to: '/company/applicants', label: 'Applicants', icon: <PeopleIcon /> },
  { to: '/company/post-job', label: 'Post a job', icon: <PlusIcon /> },
];

// Every /company/... page = top bar + the page underneath.
// <Outlet /> is where React Router puts the current page (Post a job, View job, ...).
export default function CompanyLayout() {
  // First letter of the signed-in company's name, for the Profile button
  const [initial, setInitial] = useState('');
  useEffect(() => {
    api('/auth/me')
      .then(({ user }) => setInitial(companyInitial(user.company?.name)))
      .catch(() => {}); // not signed in → the circle stays empty
  }, []);

  return (
    <div className="company-page">
      <Navbar
        tag="Employer"
        home="/company/jobs"
        links={COMPANY_LINKS}
        right={
          <NavbarAccount
            avatar={initial} 
            bell={<NotificationBell to="/company/notifications" />}
            to="/company/profile"
          />
        }
      />
      <Outlet />
    </div>
  );
}
