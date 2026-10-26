import { Outlet } from 'react-router-dom';
import CompanyNavbar from './components/CompanyNavbar.jsx';
import './styles/CompanyLayout.css';

// Every /company/... page = top bar + the page underneath.
// <Outlet /> is where React Router puts the current page (Post a job, View job, ...).
export default function CompanyLayout() {
  return (
    <div className="company-page">
      <CompanyNavbar />
      <Outlet />
    </div>
  );
}
