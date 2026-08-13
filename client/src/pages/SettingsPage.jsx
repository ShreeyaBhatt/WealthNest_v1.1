/**
 * src/pages/SettingsPage.jsx — theme toggle + a read-only account summary.
 * (Theme reuses the same ui slice the Navbar's theme button already uses.)
 */

import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme, selectTheme } from '../redux/slices/uiSlice';
import { selectCurrentUser } from '../redux/slices/authSlice';

const SettingsPage = () => {
  const theme = useSelector(selectTheme);
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();

  return (
    <div className="max-w-lg animate-fade-in space-y-4">
      <h1 className="section-title mb-2">Settings</h1>

      <div className="card flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-800 dark:text-gray-100">Dark Mode</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Currently: {theme}</p>
        </div>
        {/* Real on/off toggle (.toggle-input/.toggle-track from index.css)
            instead of a text button that just says "Switch to Light." */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="toggle-input sr-only"
            checked={theme === 'dark'}
            onChange={() => dispatch(toggleTheme())}
            aria-label="Toggle dark mode"
          />
          <span className="toggle-track" />
        </label>
      </div>

      {/* Real, read-only account info (already in Redux from login) —
          gives this page legitimate content instead of a single control,
          without inventing settings that don't actually exist yet. */}
      <div className="card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
          Account
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Email</dt>
            <dd className="text-gray-800 dark:text-gray-100 font-medium">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Role</dt>
            <dd><span className={user.role === 'admin' ? 'badge-gold' : 'badge-gray'}>{user.role}</span></dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

export default SettingsPage;
