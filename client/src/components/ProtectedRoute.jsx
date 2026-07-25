/**
 * src/components/ProtectedRoute.jsx — Auth Guard
 *
 * Wrap any route element in this to require login. If a list of
 * `roles` is given, the user's role must also be in that list —
 * otherwise they're bounced to the dashboard instead of the page.
 *
 * Usage in App.jsx:
 *   <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
 *   <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectCurrentUser } from '../redux/slices/authSlice';

const ProtectedRoute = ({ children, roles }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);
  const location = useLocation();

  if (!isAuthenticated) {
    // `state` remembers where the user was trying to go, so LoginPage
    // can send them back there after they log in.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
