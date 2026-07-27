/**
 * src/pages/InvestmentsPage.jsx
 */

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiChevronUp, FiChevronDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

import { getInvestments, createInvestment, updateInvestment, deleteInvestment } from '../api/investments';
import { getMyFamily } from '../api/family';
import { selectCurrentUser } from '../redux/slices/authSlice';
import { useConfirm } from '../context/ConfirmDialogContext';
import Drawer from '../components/Drawer';

const CATEGORIES = ['mutual_fund', 'stock', 'gold', 'fd', 'bond', 'ppf', 'nps', 'real_estate', 'crypto', 'other'];
const RISK_LEVELS = ['low', 'medium', 'high'];
const PAGE_SIZE = 10;

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

// Column headers a user can click to sort by — each maps to the field
// name on an investment document.
const SORTABLE_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'amount', label: 'Invested' },
  { key: 'currentValue', label: 'Current Value' },
  { key: 'returnPercentage', label: 'Return' },
];

const InvestmentsPage = () => {
  const [investments, setInvestments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null = adding new, object = editing existing
  const [family, setFamily] = useState(null); // head + members, for the "Owner" picker

  const user = useSelector(selectCurrentUser);
  const confirm = useConfirm();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // "Owner" is stored on the form as a single "Type:id" string (e.g.
  // "User:64f..." or "FamilyMember:64f...") since a <select> can only
  // hold one value — split back into { owner, ownerType } on submit.
  const ownerOptions = family
    ? [
        { key: `User:${family.head._id}`, label: `${family.head.name} (Head)` },
        ...family.members.map((m) => ({ key: `FamilyMember:${m._id}`, label: m.name })),
      ]
    : [];

  const loadInvestments = async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (search) params.search = search;
      const res = await getInvestments(params);
      setInvestments(res.data);
      setPagination(res.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load investments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvestments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    getMyFamily().then((res) => setFamily(res.data)).catch(() => setFamily(null));
  }, []);

  const handleSearch = () => {
    setPage(1); // a new search always starts back at page 1
    loadInvestments();
  };

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  // Sorting happens client-side, over just the current page of results —
  // simpler than adding sort params to the backend, and the table only
  // ever shows one page at a time anyway.
  const sortedInvestments = useMemo(() => {
    const sorted = [...investments].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      // returnPercentage is a Mongoose virtual formatted with .toFixed(2),
      // so it's a string ("100.00") — sort it as a number, not text.
      if (sort.key === 'returnPercentage') return Number(aVal) - Number(bVal);
      if (typeof aVal === 'string') return aVal.localeCompare(bVal);
      return Number(aVal) - Number(bVal);
    });
    return sort.dir === 'desc' ? sorted.reverse() : sorted;
  }, [investments, sort]);

  const canModify = (investment) =>
    user.role === 'admin' || user.role === 'family_head' || investment.owner?._id === user._id;

  const openAddForm = () => {
    setEditing(null);
    reset({
      name: '', category: 'mutual_fund', amount: '', currentValue: '', purchaseDate: '', maturityDate: '', riskLevel: 'medium', notes: '',
      ownerKey: family ? `User:${family.head._id}` : '',
    });
    setShowForm(true);
  };

  const openEditForm = (investment) => {
    setEditing(investment);
    reset({
      name: investment.name,
      category: investment.category,
      amount: investment.amount,
      currentValue: investment.currentValue,
      purchaseDate: investment.purchaseDate?.slice(0, 10),
      maturityDate: investment.maturityDate?.slice(0, 10) || '',
      riskLevel: investment.riskLevel,
      notes: investment.notes,
      ownerKey: `${investment.ownerType}:${investment.owner?._id}`,
    });
    setShowForm(true);
  };

  const onSubmit = async (formData) => {
    const { ownerKey, ...rest } = formData;
    const [ownerType, owner] = ownerKey.split(':');
    const payload = {
      ...rest,
      owner,
      ownerType,
      amount: Number(formData.amount),
      currentValue: Number(formData.currentValue),
      maturityDate: formData.maturityDate || undefined,
    };
    try {
      if (editing) {
        await updateInvestment(editing._id, payload);
        toast.success('Investment updated');
      } else {
        await createInvestment(payload);
        toast.success('Investment added');
      }
      setShowForm(false);
      loadInvestments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async (investment) => {
    const ok = await confirm(`Delete "${investment.name}"? This can't be undone.`);
    if (!ok) return;
    try {
      await deleteInvestment(investment._id);
      toast.success('Investment deleted');
      loadInvestments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="section-title">Investments</h1>
        <button className="btn-primary flex items-center gap-2" onClick={openAddForm}>
          <FiPlus /> Add Investment
        </button>
      </div>

      <div className="relative max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-10"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
      </div>

      {loading ? (
        <div className="skeleton h-48 w-full rounded-2xl" />
      ) : investments.length === 0 ? (
        <div className="card text-center py-12 text-gray-500 dark:text-gray-400">No investments found.</div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-dark-700">
                  {SORTABLE_COLUMNS.map((col) => (
                    <th key={col.key} className="pb-3 cursor-pointer select-none" onClick={() => toggleSort(col.key)}>
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sort.key === col.key && (sort.dir === 'asc' ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />)}
                      </span>
                    </th>
                  ))}
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Owner</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {sortedInvestments.map((inv) => (
                  <tr key={inv._id} className="border-b border-gray-50 dark:border-dark-800 last:border-0">
                    <td className="py-3 font-medium">
                      <Link to={`/investments/${inv._id}`} className="text-gray-800 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400">
                        {inv.name}
                      </Link>
                    </td>
                    <td className="py-3">{formatCurrency(inv.amount)}</td>
                    <td className="py-3">{formatCurrency(inv.currentValue)}</td>
                    <td className={`py-3 ${inv.isProfit ? 'text-accent-600' : 'text-danger-500'}`}>{inv.returnPercentage}%</td>
                    <td className="py-3"><span className="badge-blue">{inv.category}</span></td>
                    <td className="py-3 text-gray-500 dark:text-gray-400">{inv.owner?.name}</td>
                    <td className="py-3">
                      {canModify(inv) && (
                        <div className="flex gap-2">
                          <button onClick={() => openEditForm(inv)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700">
                            <FiEdit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(inv)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-danger-500">
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Page {pagination.page} of {pagination.totalPages} — {pagination.total} investments</span>
              <div className="flex gap-2">
                <button
                  className="btn-secondary !py-1.5 !px-3 flex items-center gap-1 disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <FiChevronLeft /> Prev
                </button>
                <button
                  className="btn-secondary !py-1.5 !px-3 flex items-center gap-1 disabled:opacity-40"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <FiChevronRight />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Drawer open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Investment' : 'Add Investment'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" {...register('name', { required: 'Name is required' })} />
            {errors.name && <p className="text-danger-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Owner</label>
            <select className="input" {...register('ownerKey', { required: true })}>
              {ownerOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            {ownerOptions.length === 0 && (
              <p className="text-danger-500 text-sm mt-1">
                You need to <Link to="/family" className="underline">create a family</Link> before adding investments.
              </p>
            )}
            {errors.ownerKey && ownerOptions.length > 0 && (
              <p className="text-danger-500 text-sm mt-1">Please select an owner</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select className="input" {...register('category')}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Risk Level</label>
              <select className="input" {...register('riskLevel')}>
                {RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount Invested</label>
              <input type="number" className="input" {...register('amount', { required: true, min: 1 })} />
            </div>
            <div>
              <label className="label">Current Value</label>
              <input type="number" className="input" {...register('currentValue', { required: true, min: 0 })} />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Usually same as Amount Invested at first — use Add Transaction later for gains, SIPs, etc.
              </p>
            </div>
          </div>

          <div>
            <label className="label">Purchase Date</label>
            <input type="date" className="input" {...register('purchaseDate', { required: true })} />
          </div>

          <div>
            <label className="label">Maturity Date (optional)</label>
            <input type="date" className="input" {...register('maturityDate')} />
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} {...register('notes')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save Changes' : 'Add Investment'}</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default InvestmentsPage;
