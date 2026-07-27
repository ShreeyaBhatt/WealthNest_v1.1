/**
 * src/components/NoFamilyState.jsx
 *
 * Shown on pages that need a family to work (Dashboard, Analytics,
 * etc.) when the logged-in user hasn't created one yet — a clear path
 * forward instead of a blank page or a misleading error message.
 */

import { Link } from 'react-router-dom';

const NoFamilyState = () => (
  <div className="card text-center py-12">
    <p className="text-gray-500 dark:text-gray-400 mb-4">
      You need to create a family before you can use this page.
    </p>
    <Link to="/family" className="btn-primary">Create Your Family</Link>
  </div>
);

export default NoFamilyState;
