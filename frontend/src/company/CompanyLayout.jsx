import { Outlet } from 'react-router-dom';
import CompanyNavbar from './components/CompanyNavbar.jsx';
import './CompanyLayout.css';

// Every /company/... page = top bar + the page underneath.
export default function CompanyLayout() {
  return (
    <div className="company-page">
      <CompanyNavbar />
      <Outlet />
    </div>
  );
}
