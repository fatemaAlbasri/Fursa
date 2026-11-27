import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Navbar, { NavbarAccount } from '../shared/components/Navbar.jsx';
import NotificationBell from '../shared/components/NotificationBell.jsx';
import { BriefcaseIcon, CardIcon, ClockIcon, InfoIcon, PeopleIcon, PlusIcon } from '../shared/components/icons.jsx';
import { api } from '../shared/api.js';
import { companyInitial } from '../shared/utils/jobFormat.js';
import './styles/CompanyLayout.css';

// top bar with the company's links
const COMPANY_LINKS = [
  { to: '/company/jobs', label: 'Jobs', icon: <BriefcaseIcon /> },
  { to: '/company/applicants', label: 'Applicants', icon: <PeopleIcon /> },
  { to: '/company/post-job', label: 'Post a job', icon: <PlusIcon /> },
];

// Shown on every company page until the admin approves the company,
// then (if a paid plan was picked at sign up) until that plan is paid for
function ReviewBanner({ company }) {
  if (!company?.status) return null;
  const plan = company.requested_plan;

  if (company.status === 'approved') {
    if (!plan) return null;
    return (
      <div className="company-review company-review--approved" role="status">
        <div className="company-review__inner">
          <CardIcon />
          <p>
            <strong>Your company is approved.</strong> You picked the {plan.name} plan: you're on Free until you
            pay for it.{' '}
            <Link to={`/company/payment/${plan.id}`} className="company-review__link">
              Pay for {plan.name} →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const pending = company.status === 'pending';
  return (
    <div className={`company-review company-review--${company.status}`} role="status">
      <div className="company-review__inner">
        {pending ? <ClockIcon /> : <InfoIcon />}
        <p>
          {pending ? (
            <>
              <strong>Your company is being reviewed.</strong> We're checking your CR number. You can set up
              your profile and save jobs as drafts, and publish them once you're approved.
              {plan && <> You'll pay for the {plan.name} plan after that.</>}
            </>
          ) : (
            <>
              <strong>Your company was not approved.</strong>{' '}
              {company.rejection_reason && <>Reason: {company.rejection_reason}. </>}
              Fix your details and send them again.{' '}
              <Link to="/company/review" className="company-review__link">
                Fix and send again →
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

// Every /company/... page = top bar + the page underneath.
// <Outlet /> is where React Router puts the current page (Post a job, View job, ...).
export default function CompanyLayout() {
  // First letter of the signed-in company's name, for the Profile button
  const [initial, setInitial] = useState('');
  // 'pending' | 'approved' | 'rejected': a new company can't publish jobs until the admin approves it
  const [review, setReview] = useState(null);
  // loaded again on every page change, so the banner goes away right after paying / being approved
  const { pathname } = useLocation();
  useEffect(() => {
    api('/auth/me')
      .then(({ user }) => {
        setInitial(companyInitial(user.company?.name));
        setReview(user.company || null);
      })
      .catch(() => {}); // not signed in → the circle stays empty
  }, [pathname]);

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
      {/* not on the fix page itself, it shows the reason already */}
      {pathname !== '/company/review' && <ReviewBanner company={review} />}
      <Outlet />
    </div>
  );
}
