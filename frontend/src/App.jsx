import { Routes, Route, Navigate, Link } from 'react-router-dom';
import SignIn from './shared/pages/SignIn.jsx';
import Signup from './shared/pages/Signup.jsx';
import Layout from './shared/components/Layout.jsx';
import Landing from './shared/pages/Landing.jsx';
import ForgotPassword from './shared/pages/ForgotPassword.jsx';
import ChangePassword from './shared/pages/ChangePassword.jsx';
import ResetPassword from './shared/pages/ResetPassword.jsx';

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
      <Route element={<Layout right={<Link to="/jobseeker" className="back-link">← Back to profile</Link>} />}>
        <Route path="/jobseeker/change-password" element={<ChangePassword role="jobseeker" />} />
      </Route>
      <Route element={<Layout right={<Link to="/company" className="back-link">← Back to profile</Link>} />}>
        <Route path="/company/change-password" element={<ChangePassword role="company" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />

      {/* edit routes after adding pages*/}
      <Route path="/jobseeker" element={<h1>Job seeker home</h1>} />
      <Route path="/company" element={<h1>Company home</h1>} />

    </Routes>
  );
}
