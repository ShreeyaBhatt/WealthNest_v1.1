/**
 * src/pages/InvestmentDetailPage.jsx
 *
 * Shows one investment's full detail plus its transaction history —
 * this was previously impossible to see from the UI at all (the
 * backend transaction API existed since Phase 3, but nothing called it).
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiPlus, FiChevronRight } from 'react-icons/fi';

import { getInvestment } from '../api/investments';
import { getTransactions, createTransaction } from '../api/transactions';
import Drawer from '../components/Drawer';

const TRANSACTION_TYPES = ['buy', 'sell', 'sip', 'dividend', 'interest', 'withdrawal', 'deposit'];

const TYPE_BADGE = {
  buy: 'badge-green', sip: 'badge-green', deposit: 'badge-green', dividend: 'badge-blue',
  interest: 'badge-blue', sell: 'badge-red', withdrawal: 'badge-red',
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

const formatDate = (value) => new Date(value).toLocaleDateString('en-IN');

const InvestmentDetailPage = () => {
  const { id } = useParams();
  const [investment, setInvestment] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const loadAll = async () => {
    try {
      const [invRes, txRes] = await Promise.all([getInvestment(id), getTransactions(id)]);
      setInvestment(invRes.data);
      setTransactions(txRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load investment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openDrawer = () => {
    reset({ type: 'buy', date: new Date().toISOString().slice(0, 10), amount: '', units: '', unitPrice: '', notes: '' });
    setDrawerOpen(true);
  };

  const onSubmitTransaction = async (formData) => {
    try {
      await createTransaction({
        type: formData.type,
        transactionDate: formData.date,
        amount: Number(formData.amount),
        units: formData.units ? Number(formData.units) : undefined,
        unitPrice: formData.unitPrice ? Number(formData.unitPrice) : undefined,
        notes: formData.notes,
        investment: id,
      });
      toast.success('Transaction recorded');
      setDrawerOpen(false);
      loadAll(); // refresh — the investment's currentValue just changed too
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add transaction');
    }
  };

  if (loading) return <div className="skeleton h-64 w-full rounded-2xl" />;
  if (!investment) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/investments" className="hover:text-primary-600 dark:hover:text-primary-400">Investments</Link>
        <FiChevronRight size={14} />
        <span className="text-gray-700 dark:text-gray-200">{investment.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">{investment.name}</h1>
          <div className="flex gap-2 mt-2">
            <span className="badge-blue">{investment.category}</span>
            <span className="badge-gray">{investment.owner?.name}</span>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openDrawer}>
          <FiPlus /> Add Transaction
        </button>
      </div>

      {/* Metrics — 2x2 grid, matches the "Invested / Current Value / Gain / Purchase Date" pattern */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Invested Amount</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(investment.amount)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Current Value</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(investment.currentValue)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Gain / Loss</p>
          <p className={`text-xl font-bold ${investment.isProfit ? 'text-accent-600' : 'text-danger-500'}`}>
            {formatCurrency(investment.returnAmount)} ({investment.returnPercentage}%)
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Purchase Date</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatDate(investment.purchaseDate)}</p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No transactions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-dark-700">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Units</th>
                  <th className="pb-3">Price/Unit</th>
                  <th className="pb-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id} className="border-b border-gray-50 dark:border-dark-800 last:border-0">
                    <td className="py-3">{formatDate(tx.transactionDate)}</td>
                    <td className="py-3"><span className={TYPE_BADGE[tx.type] || 'badge-gray'}>{tx.type}</span></td>
                    <td className="py-3">{formatCurrency(tx.amount)}</td>
                    <td className="py-3">{tx.units || '–'}</td>
                    <td className="py-3">{tx.unitPrice ? formatCurrency(tx.unitPrice) : '–'}</td>
                    <td className="py-3 text-gray-500 dark:text-gray-400 truncate max-w-[10rem]" title={tx.notes}>{tx.notes || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add Transaction">
        <form onSubmit={handleSubmit(onSubmitTransaction)} className="space-y-4">
          <div>
            <label className="label">Transaction Type</label>
            <select className="input" {...register('type')}>
              {TRANSACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Date</label>
            <input type="date" className="input" {...register('date', { required: true })} />
          </div>

          <div>
            <label className="label">Amount (₹)</label>
            <input type="number" className="input" {...register('amount', { required: 'Amount is required', min: 0.01 })} />
            {errors.amount && <p className="text-danger-500 text-sm mt-1">{errors.amount.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Units (optional)</label>
              <input type="number" step="any" className="input" {...register('units', { min: { value: 0, message: 'Cannot be negative' } })} />
              {errors.units && <p className="text-danger-500 text-sm mt-1">{errors.units.message}</p>}
            </div>
            <div>
              <label className="label">Price/Unit (optional)</label>
              <input type="number" step="any" className="input" {...register('unitPrice', { min: { value: 0, message: 'Cannot be negative' } })} />
              {errors.unitPrice && <p className="text-danger-500 text-sm mt-1">{errors.unitPrice.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} {...register('notes')} />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Transaction'}
          </button>
        </form>
      </Drawer>
    </div>
  );
};

export default InvestmentDetailPage;
