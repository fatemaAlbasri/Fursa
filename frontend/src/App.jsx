import { Routes, Route, Navigate, Link } from 'react-router-dom'

import { NavbarAccount } from './shared/components/Navbar.jsx'
import Layout from './shared/components/Layout.jsx'
import SignIn from './shared/pages/SignIn.jsx'
import Signup from './shared/pages/Signup.jsx'
import Landing from './shared/pages/Landing.jsx'
import ForgotPassword from './shared/pages/ForgotPassword.jsx'
import ChangePassword from './shared/pages/ChangePassword.jsx'
import ResetPassword from './shared/pages/ResetPassword.jsx'
import Notifications from './shared/pages/Notifications.jsx'
import NotificationBell from './shared/components/NotificationBell.jsx'
import {
  HomeIcon,
  BuildingIcon,
  SparkleIcon,
  FileIcon
} from './shared/components/icons.jsx'

import CompanyLayout from './company/CompanyLayout.jsx'
import CompanyJobs from './company/pages/CompanyJobs.jsx'
import PostJob from './company/pages/PostJob.jsx'
import JobView from './company/pages/JobView.jsx'
import RejectApplicants from './company/pages/RejectApplicants.jsx'
import Applicants from './company/pages/Applicants.jsx'
import ApplicantView from './company/pages/ApplicantView.jsx'
import CompanyProfile from './company/pages/CompanyProfile.jsx'
import DeleteAccount from './company/pages/DeleteAccount.jsx'
import Plans from './company/pages/Plans.jsx'
import Payment from './company/pages/Payment.jsx'

import JobsForYou from './jobseeker/pages/JobsForYou.jsx'
import JobDetails from './jobseeker/pages/JobDetails.jsx'
import AllJobs from './jobseeker/pages/AllJobs.jsx'
import Companies from './jobseeker/pages/Companies.jsx'
import CompanyDetails from './jobseeker/pages/CompanyDetails.jsx'
import CvOptimizer from './jobseeker/pages/CvOptimizer.jsx'
import CvReport from './jobseeker/pages/CvReport.jsx'
import MyApplications from './jobseeker/pages/MyApplications.jsx'
import ApplicationDetails from './jobseeker/pages/ApplicationDetails.jsx'
import Profile from './jobseeker/pages/Profile.jsx'
import UserInitials from './jobseeker/components/UserInitials.jsx'

const SEEKER_LINKS = [
  { to: '/jobseeker/jobs', label: 'Jobs for you', icon: <HomeIcon /> },
  { to: '/jobseeker/companies', label: 'Companies', icon: <BuildingIcon /> },
  {
    to: '/jobseeker/cv-optimizer',
    label: 'AI CV Optimizer',
    icon: <SparkleIcon />
  },
  {
    to: '/jobseeker/applications',
    label: 'My applications',
    icon: <FileIcon />
  }
]

const back = (to, label = 'Back') => (
  <Link to={to} className="back-link">
    ← {label}
  </Link>
)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<Layout />}>
        {/* both roles; ?role= picks which Sign In tab to go back to */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        {/* opened from the reset email: /reset-password?token=... */}
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      <Route
        element={
          <Layout right={back('/jobseeker/profile', 'Back to profile')} />
        }
      >
        <Route
          path="/jobseeker/change-password"
          element={<ChangePassword role="jobseeker" />}
        />
      </Route>
      <Route
        element={<Layout right={back('/company/profile', 'Back to profile')} />}
      >
        <Route
          path="/company/change-password"
          element={<ChangePassword role="company" />}
        />
        <Route path="/company/delete-account" element={<DeleteAccount />} />
      </Route>
      <Route
        element={<Layout tag="Employer" right={back('/company/profile')} />}
      >
        <Route path="/company/plans" element={<Plans />} />
      </Route>
      <Route element={<Layout right={back('/company/plans')} />}>
        <Route path="/company/payment/:planId" element={<Payment />} />
      </Route>

      {/* job seeker pages */}
      <Route
        path="/jobseeker"
        element={
          <Layout
            links={SEEKER_LINKS}
            right={
              <NavbarAccount
                avatar={<UserInitials />}
                bell={<NotificationBell to="/jobseeker/notifications" />}
                to="/jobseeker/profile"
              />
            }
          />
        }
      >
        <Route index element={<Navigate to="/jobseeker/jobs" replace />} />
        <Route path="jobs" element={<JobsForYou />} />
        <Route path="jobs/all" element={<AllJobs />} />
        <Route path="jobs/:id" element={<JobDetails />} />
        <Route path="companies" element={<Companies />} />
        <Route path="companies/:id" element={<CompanyDetails />} />
        <Route path="cv-optimizer" element={<CvOptimizer />} />
        <Route path="cv-optimizer/report" element={<CvReport />} />
        <Route path="applications" element={<MyApplications />} />
        <Route path="applications/:id" element={<ApplicationDetails />} />
        <Route
          path="notifications"
          element={<Notifications role="jobseeker" />}
        />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* company pages */}
      <Route path="/company" element={<CompanyLayout />}>
        <Route index element={<Navigate to="/company/jobs" replace />} />
        <Route path="jobs" element={<CompanyJobs />} />
        <Route path="post-job" element={<PostJob />} />
        <Route path="jobs/:id" element={<JobView />} />
        <Route path="jobs/:id/edit" element={<JobView startEditing />} />
        <Route path="jobs/:id/preview" element={<JobDetails preview />} />
        <Route path="jobs/:id/reject" element={<RejectApplicants />} />
        {/* one applicant: :id = job id, :appId = application id */}
        <Route path="jobs/:id/applicants/:appId" element={<ApplicantView />} />
        <Route path="applicants" element={<Applicants />} />
        <Route
          path="notifications"
          element={<Notifications role="company" />}
        />
        <Route path="profile" element={<CompanyProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
