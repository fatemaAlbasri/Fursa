import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './shared/pages/SignIn.jsx';
import Signup from './shared/pages/Signup.jsx';
import Layout from './shared/components/Layout.jsx';

export default function App() {
  return (
    <Routes>
      {/* "/" will become the Landing page later */}
      <Route path="/" element={<Navigate to="/signin" replace />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<Signup />} />
      {/* Pages inside this route share the Navbar. Later: /jobseeker/* and /company/*, e.g.
          <Route path="/jobseeker" element={<Layout links={[{ to: '/jobseeker/jobs', label: 'Jobs' }]} />}>
            <Route path="jobs" element={<Jobs />} />
          </Route> */}
      <Route element={<Layout />}></Route>
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  );
}
