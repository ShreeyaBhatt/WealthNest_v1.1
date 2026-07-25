/**
 * src/pages/SettingsPage.jsx — currently just the theme toggle.
 * (Reuses the same ui slice the Navbar's theme button already uses.)
 */

import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme, selectTheme } from '../redux/slices/uiSlice';

const SettingsPage = () => {
  const theme = useSelector(selectTheme);
  const dispatch = useDispatch();

  return (
    <div className="max-w-lg animate-fade-in">
      <h1 className="section-title mb-6">Settings</h1>

      <div className="card flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-800 dark:text-gray-100">Dark Mode</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Currently: {theme}</p>
        </div>
        <button className="btn-secondary" onClick={() => dispatch(toggleTheme())}>
          Switch to {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
