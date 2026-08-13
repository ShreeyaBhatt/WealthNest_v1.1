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
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { FiTrendingUp, FiDollarSign, FiPieChart, FiActivity, FiCpu } from 'react-icons/fi';

import { getDashboard, getRiskPrediction, getFuturePrediction, getRecommendations, getHealthScore } from '../api/dashboard';
import { selectCurrentUser } from '../redux/slices/authSlice';
import NoFamilyState from '../components/NoFamilyState';
import StatCard from '../components/StatCard';

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

const DashboardPage = () => {
  const user = useSelector(selectCurrentUser);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [breakdownState, dispatchBreakdown] = useReducer(breakdownViewReducer, { view: 'category' });

  const [risk, setRisk] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [future, setFuture] = useState(null);
  const [futureLoading, setFutureLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    // A brand-new user has no family yet — the backend would reject this
    // call with "Join a family first", which isn't a real error here, just
    // an expected state. Skip the request entirely instead of firing it
    // and then toasting the rejection right before NoFamilyState renders.
    if (!user?.family) {
      setLoading(false);
      return;
    }

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
  }, [user?.family]);

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

  const handleGetRecommendations = async () => {
    setRecommendationsLoading(true);
    try {
      const res = await getRecommendations();
      setRecommendations(res.data.recommendations);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not get recommendations');
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const handleGetHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await getHealthScore();
      setHealth(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not get health score');
    } finally {
      setHealthLoading(false);
    }
  };

  if (loading) {
    return <div className="skeleton h-64 w-full rounded-2xl" />;
  }

  if (!user?.family) {
    return <NoFamilyState />;
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
              accent="bg-gain-50 dark:bg-gain-900/30 text-gain-600 dark:text-gain-400"
              borderColor="border-gain-500"
            />
            <StatCard
              icon={FiActivity}
              label="Total Return"
              value={`${formatCurrency(stats.totalReturn)} (${stats.returnPercentage}%)`}
              subLabel="Absolute return"
              accent={stats.totalReturn >= 0 ? 'bg-gain-50 dark:bg-gain-900/30 text-gain-600 dark:text-gain-400' : 'bg-danger-500/10 text-danger-500'}
              borderColor={stats.totalReturn >= 0 ? 'border-gain-500' : 'border-danger-500'}
            />
            <StatCard
              icon={FiPieChart} label="Investments" value={stats.investmentCount}
              subLabel="Active records"
              accent="bg-gold-50 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400"
              borderColor="border-gold-400"
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
                <button className="btn-secondary flex items-center gap-2" onClick={handleGetRisk} disabled={riskLoading}>
                  <FiCpu size={16} className="text-gold-500" /> {riskLoading ? 'Predicting...' : 'Predict My Risk Profile'}
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
                <button className="btn-secondary flex items-center gap-2" onClick={handleGetFuture} disabled={futureLoading}>
                  <FiCpu size={16} className="text-gold-500" /> {futureLoading ? 'Predicting...' : 'Predict Future Value'}
                </button>
              )}
            </div>

            <div className="card">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Portfolio Health Score</h2>
              {health ? (
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{health.healthScore}<span className="text-base font-normal text-gray-400">/100</span></p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{health.summary}</p>
                  <ul className="text-xs text-gray-400 dark:text-gray-500 mt-2 space-y-0.5">
                    <li>Diversification: {health.breakdown.diversification}/100</li>
                    <li>Risk alignment: {health.breakdown.riskAlignment}/100</li>
                  </ul>
                </div>
              ) : (
                <button className="btn-secondary flex items-center gap-2" onClick={handleGetHealth} disabled={healthLoading}>
                  <FiCpu size={16} className="text-gold-500" /> {healthLoading ? 'Calculating...' : 'Calculate Health Score'}
                </button>
              )}
            </div>

            <div className="card">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Recommendations</h2>
              {recommendations ? (
                recommendations.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Your portfolio already looks close to your risk profile's target split — nothing to flag right now.
                  </p>
                ) : (
                  <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-200">
                    {recommendations.map((rec, i) => (
                      <li key={i} className="flex gap-2">
                        <span className={`badge-${rec.action === 'decrease' ? 'red' : 'blue'} shrink-0`}>{rec.action}</span>
                        <span>{rec.reason}</span>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <button className="btn-secondary flex items-center gap-2" onClick={handleGetRecommendations} disabled={recommendationsLoading}>
                  <FiCpu size={16} className="text-gold-500" /> {recommendationsLoading ? 'Analyzing...' : 'Get Recommendations'}
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
