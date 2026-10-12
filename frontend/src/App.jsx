import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './shared/pages/SignIn.jsx';
import Signup from './shared/pages/Signup.jsx';

export default function App() {
  return (
    <Routes>
      {/* "/" will become the Landing page later */}
      <Route path="/" element={<Navigate to="/signin" replace />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<Signup />} />
      {/* Later: /jobseeker/* and /company/* */}
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  );
}
