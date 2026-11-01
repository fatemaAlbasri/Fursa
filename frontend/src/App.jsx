import { Routes, Route, Navigate, Link } from 'react-router-dom'
import SignIn from './shared/pages/SignIn.jsx'
import Signup from './shared/pages/Signup.jsx'
import Layout from './shared/components/Layout.jsx'
import Landing from './shared/pages/Landing.jsx'
import ForgotPassword from './shared/pages/ForgotPassword.jsx'
import ChangePassword from './shared/pages/ChangePassword.jsx'
import ResetPassword from './shared/pages/ResetPassword.jsx'


import CompanyLayout from './company/CompanyLayout.jsx'
import PostJob from './company/pages/PostJob.jsx'
import JobView from './company/pages/JobView.jsx'
import RejectApplicants from './company/pages/RejectApplicants.jsx'
import Applicants from './company/pages/Applicants.jsx'
import CompanyHome from './company/pages/CompanyHome.jsx'


import JobsForYou from './jobseeker/pages/JobsForYou.jsx'
import JobDetails from './jobseeker/pages/JobDetails.jsx'
import UserInitials from './jobseeker/components/UserInitials.jsx'

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
          (temporary: points to the role's home until the profile pages exist) */}
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
              <Link to="/company" className="back-link">
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />

      {/* Job seeker pages: shared Navbar with only the pages that exist so far */}
      <Route
        element={
          <Layout
            links={[{ to: '/jobseeker/jobs', label: 'Jobs for you' }]}
            right={<UserInitials />}
          />
        }
      >
        <Route path="/jobseeker/jobs" element={<JobsForYou />} />
        {/* :id = the job's real id, e.g. /jobseeker/jobs/3 */}
        <Route path="/jobseeker/jobs/:id" element={<JobDetails />} />
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
      </Route>
    </Routes>
  )
}
