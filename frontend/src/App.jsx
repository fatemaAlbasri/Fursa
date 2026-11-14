import { Routes, Route, Navigate, Link } from 'react-router-dom';
import SignIn from './shared/pages/SignIn.jsx';
import Signup from './shared/pages/Signup.jsx';
import Layout from './shared/components/Layout.jsx';
import Landing from './shared/pages/Landing.jsx';
import ForgotPassword from './shared/pages/ForgotPassword.jsx';
import ChangePassword from './shared/pages/ChangePassword.jsx';
import ResetPassword from './shared/pages/ResetPassword.jsx';

import CompanyLayout from './company/CompanyLayout.jsx';
import PostJob from './company/pages/PostJob.jsx';
import JobView from './company/pages/JobView.jsx';
import RejectApplicants from './company/pages/RejectApplicants.jsx';
import Applicants from './company/pages/Applicants.jsx';
import CompanyHome from './company/pages/CompanyHome.jsx';
import CompanyProfile from './company/pages/CompanyProfile.jsx';
import DeleteAccount from './company/pages/DeleteAccount.jsx';
import Plans from './company/pages/Plans.jsx';
import Payment from './company/pages/Payment.jsx';

import JobsForYou from './jobseeker/pages/JobsForYou.jsx';
import JobDetails from './jobseeker/pages/JobDetails.jsx';
import AllJobs from './jobseeker/pages/AllJobs.jsx';
import Companies from './jobseeker/pages/Companies.jsx';
import CompanyDetails from './jobseeker/pages/CompanyDetails.jsx';
import CvOptimizer from './jobseeker/pages/CvOptimizer.jsx';
import CvReport from './jobseeker/pages/CvReport.jsx';
import MyApplications from './jobseeker/pages/MyApplications.jsx';
import ApplicationDetails from './jobseeker/pages/ApplicationDetails.jsx';
import UserInitials from './jobseeker/components/UserInitials.jsx';
import { NavbarAccount } from './shared/components/Navbar.jsx';
import { HomeIcon, BuildingIcon, SparkleIcon, FileIcon } from './shared/components/icons.jsx';

// Job seeker menu. `soon` = shown in the menu but not built yet, so it can't be clicked.
const SEEKER_LINKS = [
  { to: '/jobseeker/jobs', label: 'Jobs for you', icon: <HomeIcon /> },
  { to: '/jobseeker/companies', label: 'Companies', icon: <BuildingIcon /> },
  { to: '/jobseeker/cv-optimizer', label: 'AI CV Optimizer', icon: <SparkleIcon /> },
  { to: '/jobseeker/applications', label: 'My applications', icon: <FileIcon /> }
];


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<Signup />} />
      {/* Pages inside this route share the Navbar. Later: /jobseeker/* and /company/*, e.g.
          <Route path="/jobseeker" element={<Layout links={[{ to: '/jobseeker/jobs', label: 'Jobs' }]} />}>
            <Route path="jobs" element={<Jobs />} />
          </Route> */}
      <Route element={<Layout />}>
        {/* shared by both roles; ?role=jobseeker|company only picks the Sign In tab to go back to */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        {/* opened from the reset email: /reset-password?token=... */}
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>
      {/* Change password: same page for both roles, each with its own "Back to profile" link
          (job seeker: temporary, points to the home page until the seeker profile exists) */}
      <Route
        element={
          <Layout
            right={
              <Link to="/jobseeker" className="back-link">
                ← Back to profile
              </Link>
            }
          />
        }
      >
        <Route
          path="/jobseeker/change-password"
          element={<ChangePassword role="jobseeker" />}
        />
      </Route>
      <Route
        element={
          <Layout
            right={
              <Link to="/company/profile" className="back-link">
                ← Back to profile
              </Link>
            }
          />
        }
      >
        <Route
          path="/company/change-password"
          element={<ChangePassword role="company" />}
        />
        <Route path="/company/delete-account" element={<DeleteAccount />} />
      </Route>
      {/* Change plan: logo + "Employer" and a back link (no employer menu, like the wireframe) */}
      <Route
        element={
          <Layout
            tag="Employer"
            right={
              <Link to="/company/profile" className="back-link">
                ← Back
              </Link>
            }
          />
        }
      >
        <Route path="/company/plans" element={<Plans />} />
      </Route>
      {/* Payment: logo + "Secure checkout" */}
      <Route
        element={
          <Layout
            right={
              <span className="pay-secure">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                Secure checkout
              </span>
            }
          />
        }
      >
        {/* :planId = the plan's real id, e.g. /company/payment/2 */}
        <Route path="/company/payment/:planId" element={<Payment />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />

      {/* Job seeker pages: shared Navbar (Jobs for you and Companies work so far) + bell / profile */}
      <Route element={<Layout links={SEEKER_LINKS} right={<NavbarAccount avatar={<UserInitials />} />} />}>

        <Route path="/jobseeker/jobs" element={<JobsForYou />} />
        <Route path="/jobseeker/jobs/all" element={<AllJobs />} />
        {/* :id = the job's real id, e.g. /jobseeker/jobs/3 */}
        <Route path="/jobseeker/jobs/:id" element={<JobDetails />} />
        <Route path="/jobseeker/companies" element={<Companies />} />
        {/* :id = the company's real id, e.g. /jobseeker/companies/2 */}
        <Route path="/jobseeker/companies/:id" element={<CompanyDetails />} />
        {/* AI CV Optimizer (free) and the Advanced report (after unlocking) */}
        <Route path="/jobseeker/cv-optimizer" element={<CvOptimizer />} />
        <Route path="/jobseeker/cv-optimizer/report" element={<CvReport />} />
        {/* My applications: every application with its status and progress */}
        <Route path="/jobseeker/applications" element={<MyApplications />} />
        {/* :id = the application's real id, e.g. /jobseeker/applications/5 */}
        <Route path="/jobseeker/applications/:id" element={<ApplicationDetails />} />
      </Route>
      {/* Job seeker home = Jobs for you (Sign in / Sign up send seekers to /jobseeker) */}
      <Route
        path="/jobseeker"
        element={<Navigate to="/jobseeker/jobs" replace />}
      />

      {/* Company (employer) pages — all share the employer top bar */}
      <Route path="/company" element={<CompanyLayout />}>
        <Route index element={<CompanyHome />} />
        <Route path="post-job" element={<PostJob />} />
        <Route path="jobs/:id" element={<JobView />} />
        <Route path="jobs/:id/edit" element={<JobView startEditing />} />
        <Route path="jobs/:id/reject" element={<RejectApplicants />} />
        <Route path="applicants" element={<Applicants />} />
        <Route path="profile" element={<CompanyProfile />} />
      </Route>
    </Routes>
  )
}
