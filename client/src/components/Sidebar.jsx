/**
 * src/components/Sidebar.jsx — Left Navigation Menu
 */

import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiHome, FiTrendingUp, FiUsers, FiBell, FiPieChart, FiTarget,
  FiMessageCircle, FiFileText, FiUser, FiSettings, FiShield,
} from 'react-icons/fi';
import { selectSidebarOpen } from '../redux/slices/uiSlice';
import { selectCurrentUser } from '../redux/slices/authSlice';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: FiHome },
  { to: '/investments', label: 'Investments', icon: FiTrendingUp },
  { to: '/goals', label: 'Goals', icon: FiTarget },
  { to: '/family', label: 'Family', icon: FiUsers },
  { to: '/analytics', label: 'Analytics', icon: FiPieChart },
  { to: '/ai-assistant', label: 'AI Assistant', icon: FiMessageCircle },
  { to: '/reports', label: 'Reports', icon: FiFileText },
  { to: '/notifications', label: 'Notifications', icon: FiBell },
  { to: '/profile', label: 'Profile', icon: FiUser },
  { to: '/settings', label: 'Settings', icon: FiSettings },
];

const Sidebar = () => {
  const sidebarOpen = useSelector(selectSidebarOpen);
  const user = useSelector(selectCurrentUser);

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white dark:bg-dark-850 border-r border-gray-100 dark:border-dark-700
        transition-all duration-200 z-40 pt-16 ${sidebarOpen ? 'w-64' : 'w-16'}`}
    >
      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl border-l-2 transition-colors
               ${isActive
                 ? 'bg-gold-50 text-gold-800 border-gold-500 dark:bg-gold-900/20 dark:text-gold-300 dark:border-gold-500 font-semibold'
                 : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-800'}`
            }
          >
            <Icon className="shrink-0" size={18} />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl border-l-2 transition-colors
               ${isActive
                 ? 'bg-gold-50 text-gold-800 border-gold-500 dark:bg-gold-900/20 dark:text-gold-300 dark:border-gold-500 font-semibold'
                 : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-800'}`
            }
          >
            <FiShield className="shrink-0" size={18} />
            {sidebarOpen && <span>Admin</span>}
          </NavLink>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
