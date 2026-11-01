import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import CompanyNavbar from './components/CompanyNavbar.jsx';
import { api } from '../shared/api.js';
import { companyInitial } from '../jobseeker/utils/jobFormat.js';
import './styles/CompanyLayout.css';

// Every /company/... page = top bar + the page underneath.
// <Outlet /> is where React Router puts the current page (Post a job, View job, ...).
export default function CompanyLayout() {
  // First letter of the signed-in company's name, for the Profile button
  const [initial, setInitial] = useState('');
  useEffect(() => {
    api('/auth/me')
      .then(({ user }) => setInitial(companyInitial(user.company?.name)))
      .catch(() => {}); // not signed in → keep the default letter
  }, []);

  return (
    <div className="company-page">
      <CompanyNavbar companyInitial={initial || undefined} />
      <Outlet />
    </div>
  );
}
