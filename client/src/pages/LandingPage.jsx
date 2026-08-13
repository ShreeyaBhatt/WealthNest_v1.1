/**
 * src/pages/LandingPage.jsx — Public "/" welcome page
 *
 * The first screen anyone (including an interviewer) sees, so it gets a
 * real hero + feature section instead of a placeholder. Every feature
 * bullet below maps to something the app actually does (Investments,
 * Family, the AI prediction cards on the Dashboard) — nothing invented.
 */

import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiTrendingUp, FiUsers, FiPieChart } from 'react-icons/fi';
import { selectIsAuthenticated } from '../redux/slices/authSlice';

const FEATURES = [
  {
    icon: FiTrendingUp,
    title: 'Track Every Asset',
    description: 'Mutual funds, stocks, gold, FDs, bonds, and more — all in one portfolio, with full transaction history.',
  },
  {
    icon: FiUsers,
    title: 'Manage as a Family',
    description: "Add family members and see everyone's holdings together, without everyone needing their own login.",
  },
  {
    icon: FiPieChart,
    title: 'AI-Powered Insights',
    description: 'Get a risk profile, future value projections, and rebalancing recommendations from trained ML models.',
  },
];

const LandingPage = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Already logged in? Skip the marketing page and go straight in.
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-950 to-dark-900">
      {/* ── Hero ── */}
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-xl animate-fade-in">
          <div className="text-7xl mb-4">💰</div>
          <h1 className="text-5xl font-bold gradient-text mb-3">WealthNest</h1>
          <p className="text-gray-300 mb-8">
            An AI-powered family investment portfolio tracker — track mutual funds, stocks,
            gold, FDs and more together as a family, with ML-driven risk and growth predictions.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/login"
              className="py-2.5 px-5 rounded-xl font-semibold border border-gold-400/40 text-gold-200 hover:bg-white/5 transition-all duration-200 active:scale-95"
            >
              Log In
            </Link>
            <Link to="/register" className="btn-gold">Get Started</Link>
          </div>
        </div>
      </div>

      {/* ── Feature highlights ── */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card bg-dark-850/60 border-dark-700 animate-slide-up">
              <div className="w-11 h-11 rounded-xl bg-gold-400/10 text-gold-400 flex items-center justify-center mb-4">
                <Icon size={22} />
              </div>
              <h2 className="font-semibold text-white mb-1.5">{title}</h2>
              <p className="text-sm text-gray-400">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
