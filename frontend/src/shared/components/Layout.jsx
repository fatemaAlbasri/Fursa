import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';

// Wrap a group of routes with this so every page in it gets the same Navbar.
export default function Layout({ tag, links, right }) {
  return (
    <div className="page">
      <Navbar tag={tag} links={links} right={right} />
      <Outlet />
    </div>
  );
}