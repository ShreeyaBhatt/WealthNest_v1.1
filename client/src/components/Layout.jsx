/**
 * src/components/Layout.jsx — Shell for Every Logged-In Page
 *
 * <Outlet/> is React Router's way of saying "render whichever nested
 * route matched here" — see App.jsx, where every protected page is
 * nested inside one <Route element={<Layout/>}>. This means Navbar and
 * Sidebar are only written once instead of on every single page.
 */

import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { selectSidebarOpen } from '../redux/slices/uiSlice';

const Layout = () => {
  const sidebarOpen = useSelector(selectSidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      <Navbar />
      <Sidebar />
      <main className={`pt-20 pb-10 px-4 sm:px-6 transition-all duration-200 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
