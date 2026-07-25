/**
 * src/pages/DashboardPage.jsx
 *
 * WHY useReducer here instead of another useState?
 * The "which breakdown am I looking at" state (category vs. member) is
 * a single, self-contained set of transitions — a textbook case for
 * useReducer over useState once there's more than one related action.
 * It also fulfils the same role a bigger app would use useReducer for.
 */

import { useEffect, useState, useReducer } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiTrendingUp, FiDollarSign, FiPieChart, FiActivity } from 'react-icons/fi';

import { getDashboard, getRiskPrediction, getFuturePrediction } from '../api/dashboard';

const breakdownViewReducer = (state, action) => {
  switch (action.type) {
    case 'SHOW_CATEGORY':
      return { view: 'category' };
    case 'SHOW_MEMBER':
      return { view: 'member' };
    default:
      return state;
  }
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

// borderColor gives each card the same "colour accent" left border the
// SRS mockups use, so the four stat cards read as a set at a glance.
const StatCard = ({ icon: Icon, label, value, subLabel, accent, borderColor }) => (
  <div className={`stat-card border-l-4 ${borderColor}`}>
    <div className={`p-3 rounded-xl ${accent}`}>
      <Icon size={22} />
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      {subLabel && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subLabel}</p>}
    </div>
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [breakdownState, dispatchBreakdown] = useReducer(breakdownViewReducer, { view: 'category' });

  const [risk, setRisk] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [future, setFuture] = useState(null);
  const [futureLoading, setFutureLoading] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const res = await getDashboard();
        setStats(res.data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not load dashboard');
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const handleGetRisk = async () => {
    setRiskLoading(true);
    try {
      const res = await getRiskPrediction();
      setRisk(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not get risk prediction');
    } finally {
      setRiskLoading(false);
    }
  };

  const handleGetFuture = async () => {
    setFutureLoading(true);
    try {
      const res = await getFuturePrediction();
      setFuture(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not get future value prediction');
    } finally {
      setFutureLoading(false);
    }
  };

  if (loading) {
    return <div className="skeleton h-64 w-full rounded-2xl" />;
  }

  if (!stats) {
    return null;
  }

  const breakdown = breakdownState.view === 'category' ? stats.categoryBreakdown : stats.memberBreakdown;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="section-title">Dashboard</h1>

      {stats.investmentCount === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">You haven't added any investments yet.</p>
          <Link to="/investments" className="btn-primary">Add Your First Investment</Link>
        </div>
      ) : (
        <>
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={FiDollarSign} label="Total Invested" value={formatCurrency(stats.totalInvested)}
              subLabel="Across all investments"
              accent="bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
              borderColor="border-primary-500"
            />
            <StatCard
              icon={FiTrendingUp} label="Current Value" value={formatCurrency(stats.totalValue)}
              subLabel="As of today"
              accent="bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400"
              borderColor="border-accent-500"
            />
            <StatCard
              icon={FiActivity}
              label="Total Return"
              value={`${formatCurrency(stats.totalReturn)} (${stats.returnPercentage}%)`}
              subLabel="Absolute return"
              accent={stats.totalReturn >= 0 ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400' : 'bg-danger-500/10 text-danger-500'}
              borderColor={stats.totalReturn >= 0 ? 'border-accent-500' : 'border-danger-500'}
            />
            <StatCard
              icon={FiPieChart} label="Investments" value={stats.investmentCount}
              subLabel="Active records"
              accent="bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300"
              borderColor="border-gray-300 dark:border-dark-600"
            />
          </div>

          {/* ── Breakdown ── */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">Portfolio Breakdown</h2>
              <div className="flex gap-2">
                <button
                  className={breakdownState.view === 'category' ? 'btn-primary !py-1.5 !px-3 text-sm' : 'btn-secondary !py-1.5 !px-3 text-sm'}
                  onClick={() => dispatchBreakdown({ type: 'SHOW_CATEGORY' })}
                >
                  By Category
                </button>
                <button
                  className={breakdownState.view === 'member' ? 'btn-primary !py-1.5 !px-3 text-sm' : 'btn-secondary !py-1.5 !px-3 text-sm'}
                  onClick={() => dispatchBreakdown({ type: 'SHOW_MEMBER' })}
                >
                  By Member
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(breakdown).map(([key, value]) => {
                const percent = stats.totalValue === 0 ? 0 : ((value / stats.totalValue) * 100).toFixed(1);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-300">{key}</span>
                      <span className="text-gray-500 dark:text-gray-400">{formatCurrency(value)} ({percent}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-dark-700 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── AI Predictions ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">AI Risk Prediction</h2>
              {risk ? (
                <div>
                  <span className={`badge-${risk.riskCategory === 'aggressive' ? 'red' : risk.riskCategory === 'moderate' ? 'yellow' : 'green'} text-sm`}>
                    {risk.riskCategory}
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Confidence: {risk.riskConfidence}%</p>
                </div>
              ) : (
                <button className="btn-secondary" onClick={handleGetRisk} disabled={riskLoading}>
                  {riskLoading ? 'Predicting...' : 'Predict My Risk Profile'}
                </button>
              )}
            </div>

            <div className="card">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">AI Future Value Prediction</h2>
              {future ? (
                <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-200">
                  <li>1 year: {formatCurrency(future.oneYear)}</li>
                  <li>3 years: {formatCurrency(future.threeYears)}</li>
                  <li>5 years: {formatCurrency(future.fiveYears)}</li>
                </ul>
              ) : (
                <button className="btn-secondary" onClick={handleGetFuture} disabled={futureLoading}>
                  {futureLoading ? 'Predicting...' : 'Predict Future Value'}
                </button>
              )}
            </div>
          </div>

          {/* ── Recent Transactions ── */}
          <div className="card">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Recent Transactions</h2>
            {stats.recentTransactions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-dark-700">
                {stats.recentTransactions.map((tx) => (
                  <li key={tx._id} className="py-2 flex justify-between text-sm">
                    {tx.investment?._id ? (
                      <Link
                        to={`/investments/${tx.investment._id}`}
                        className="text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        {tx.type} — {tx.investment.name}
                      </Link>
                    ) : (
                      <span className="text-gray-700 dark:text-gray-200">{tx.type} — Investment</span>
                    )}
                    <span className="text-gray-500 dark:text-gray-400">{formatCurrency(tx.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
