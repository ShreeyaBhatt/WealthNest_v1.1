/**
 * src/pages/LandingPage.jsx — Public "/" welcome page
 */

import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../redux/slices/authSlice';
import { Navigate } from 'react-router-dom';

const LandingPage = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Already logged in? Skip the marketing page and go straight in.
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900 px-4">
      <div className="text-center max-w-xl animate-fade-in">
        <div className="text-7xl mb-4">💰</div>
        <h1 className="text-4xl font-bold gradient-text mb-3">WealthNest</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          An AI-powered family investment portfolio tracker — track mutual funds, stocks,
          gold, FDs and more together as a family, with ML-driven risk and growth predictions.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/login" className="btn-secondary">Log In</Link>
          <Link to="/register" className="btn-primary">Get Started</Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
