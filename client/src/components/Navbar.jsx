/**
 * src/components/Navbar.jsx — Top Bar
 */

import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiMenu, FiSun, FiMoon, FiLogOut, FiBell } from 'react-icons/fi';
import toast from 'react-hot-toast';

import { toggleSidebar, toggleTheme, selectTheme } from '../redux/slices/uiSlice';
import { logout, selectCurrentUser, selectRefreshToken } from '../redux/slices/authSlice';
import { logout as logoutApi } from '../api/auth';
import Avatar from './Avatar';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useSelector(selectTheme);
  const user = useSelector(selectCurrentUser);
  const refreshToken = useSelector(selectRefreshToken);

  const handleLogout = async () => {
    try {
      await logoutApi(refreshToken);
    } catch {
      // Even if the server call fails (e.g. token already expired),
      // we still want to clear the local session below.
    }
    dispatch(logout());
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-dark-850 border-b border-gray-100 dark:border-dark-700 z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Toggle sidebar"
        >
          <FiMenu size={20} />
        </button>
        <span className="text-lg font-bold tracking-tight gradient-text">💰 WealthNest</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800"
          onClick={() => dispatch(toggleTheme())}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
        </button>

        <button
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800"
          onClick={() => navigate('/notifications')}
          aria-label="Notifications"
        >
          <FiBell size={18} />
        </button>

        <div className="flex items-center gap-2 ml-2">
          <Avatar name={user?.name} size="sm" />
          <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200">
            {user?.name}
          </span>
        </div>

        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800" onClick={handleLogout} aria-label="Logout">
          <FiLogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
