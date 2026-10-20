import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './shared/pages/SignIn.jsx';
import Signup from './shared/pages/Signup.jsx';
import Layout from './shared/components/Layout.jsx';
import Landing from './shared/pages/Landing.jsx';
import CompanyLayout from './company/CompanyLayout.jsx';
import PostJob from './company/pages/PostJob.jsx';


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
      <Route element={<Layout />}></Route>
      <Route path="*" element={<Navigate to="/" replace />} />

      {/* edit routes after adding pages*/}
      <Route path="/jobseeker" element={<h1>Job seeker home</h1>} />

      {/* Company (employer) pages — all share the employer top bar */}
      <Route path="/company" element={<CompanyLayout />}>
        <Route index element={<Navigate to="post-job" replace />} />
        <Route path="post-job" element={<PostJob />} />
      </Route>

    </Routes>
  );
}