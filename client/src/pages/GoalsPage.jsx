/**
 * src/pages/GoalsPage.jsx
 *
 * Lets a family track savings goals ("Emergency Fund", "Buy a Car",
 * "Priya's Education") separately from individual Investments — a
 * goal is a target to save TOWARD, not a specific holding. Structured
 * the same way InvestmentsPage.jsx is (useForm + Drawer + useConfirm,
 * an "owner" picker built from the family's head + members) so the
 * two CRUD pages feel like the same app.
 *
 * The "Portfolio Growth Forecast" card at the top reuses the EXISTING
 * /api/predictions/future endpoint (already built for the Dashboard —
 * see api/dashboard.js) instead of adding any new prediction/ML code.
 * It's just extra context sitting next to the goal list: "here's where
 * your whole portfolio is headed" alongside "here's what you're saving
 * toward" — the user compares the two themselves.
 */

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiTarget, FiCpu } from 'react-icons/fi';

import { getGoals, createGoal, updateGoal, deleteGoal } from '../api/goals';
import { getFuturePrediction } from '../api/dashboard';
import { getMyFamily } from '../api/family';
import { selectCurrentUser } from '../redux/slices/authSlice';
import { useConfirm } from '../context/ConfirmDialogContext';
import NoFamilyState from '../components/NoFamilyState';
import Drawer from '../components/Drawer';

const CATEGORIES = ['wealth_creation', 'retirement', 'education', 'home_purchase', 'emergency_fund', 'other'];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

// The progress bar (and the "days left" badge) change color depending
// on how the goal is doing — a plain gold bar for "on track", green
// once it's actually achieved, red once the target date has passed
// without being achieved.
const progressBarColor = (goal) => {
  if (goal.isAchieved) return 'bg-gain-500';
  if (goal.daysRemaining < 0) return 'bg-danger-500';
  return 'bg-gold-500';
};

const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null = adding new, object = editing existing
  const [family, setFamily] = useState(null); // head + members, for the "Owner" picker
  const [saving, setSaving] = useState(false);
  // Same double-submit guard used in InvestmentsPage/RegisterPage.
  const isSavingRef = useRef(false);

  const [future, setFuture] = useState(null);
  const [futureLoading, setFutureLoading] = useState(false);

  const user = useSelector(selectCurrentUser);
  const confirm = useConfirm();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const ownerOptions = family
    ? [
        { key: `User:${family.head._id}`, label: `${family.head.name} (Head)` },
        ...family.members.map((m) => ({ key: `FamilyMember:${m._id}`, label: m.name })),
      ]
    : [];

  const loadGoals = async () => {
    if (!user?.family) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getGoals();
      setGoals(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
    if (user?.family) {
      getMyFamily().then((res) => setFamily(res.data)).catch(() => setFamily(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.family]);

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

  const canModify = (goal) =>
    user.role === 'admin' || user.role === 'family_head' || goal.owner?._id === user._id;

  const openAddForm = () => {
    setEditing(null);
    reset({
      name: '', category: 'other', targetAmount: '', currentAmount: 0, targetDate: '', notes: '',
      ownerKey: family ? `User:${family.head._id}` : '',
    });
    setShowForm(true);
  };

  const openEditForm = (goal) => {
    setEditing(goal);
    reset({
      name: goal.name,
      category: goal.category,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate?.slice(0, 10),
      notes: goal.notes,
      ownerKey: `${goal.ownerType}:${goal.owner?._id}`,
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
      targetAmount: Number(formData.targetAmount),
      currentAmount: Number(formData.currentAmount) || 0,
    };
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaving(true);
    try {
      if (editing) {
        await updateGoal(editing._id, payload);
        toast.success('Goal updated');
      } else {
        await createGoal(payload);
        toast.success('Goal created');
      }
      setShowForm(false);
      loadGoals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async (goal) => {
    const ok = await confirm(`Delete "${goal.name}"? This can't be undone.`);
    if (!ok) return;
    try {
      await deleteGoal(goal._id);
      toast.success('Goal deleted');
      loadGoals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  if (!loading && !user?.family) {
    return <NoFamilyState />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="section-title">Goals</h1>
        <button className="btn-primary flex items-center gap-2" onClick={openAddForm}>
          <FiPlus /> Add Goal
        </button>
      </div>

      {/* ── Portfolio Growth Forecast (reuses the existing prediction endpoint) ── */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Portfolio Growth Forecast</h2>
        {future ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            At your portfolio's current trajectory, your total investments are projected to reach{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(future.oneYear)}</span> in 1 year,{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(future.threeYears)}</span> in 3 years, and{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(future.fiveYears)}</span> in 5 years —
            compare that against the target amounts and dates on your goals below.
          </p>
        ) : (
          <button className="btn-secondary flex items-center gap-2" onClick={handleGetFuture} disabled={futureLoading}>
            <FiCpu size={16} className="text-gold-500" /> {futureLoading ? 'Predicting...' : 'Forecast My Portfolio Growth'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="skeleton h-48 w-full rounded-2xl" />
      ) : goals.length === 0 ? (
        <div className="card text-center py-12">
          <FiTarget size={28} className="mx-auto mb-3 text-gray-300 dark:text-dark-600" />
          <p className="text-gray-500 dark:text-gray-400">No goals yet — add one to start tracking progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <div key={goal._id} className="card">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">{goal.name}</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{goal.category.replace('_', ' ')} · {goal.owner?.name}</p>
                </div>
                {canModify(goal) && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEditForm(goal)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700">
                      <FiEdit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(goal)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-danger-500">
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-300">{formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}</span>
                <span className="text-gray-500 dark:text-gray-400">{goal.progressPercent}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-dark-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${progressBarColor(goal)}`} style={{ width: `${goal.progressPercent}%` }} />
              </div>

              <div className="flex items-center justify-between mt-3">
                {goal.isAchieved ? (
                  <span className="badge-green text-sm">Achieved 🎉</span>
                ) : goal.daysRemaining < 0 ? (
                  <span className="badge-red text-sm">Overdue</span>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-500">{goal.daysRemaining} days left</span>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatCurrency(goal.amountRemaining)} to go
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Goal' : 'Add Goal'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Goal Name</label>
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
                You need to <Link to="/family" className="underline">create a family</Link> before adding goals.
              </p>
            )}
          </div>

          <div>
            <label className="label">Category</label>
            <select className="input" {...register('category')}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Target Amount</label>
              <input type="number" className="input" {...register('targetAmount', { required: 'Target amount is required', min: { value: 1, message: 'Must be greater than 0' } })} />
              {errors.targetAmount && <p className="text-danger-500 text-sm mt-1">{errors.targetAmount.message}</p>}
            </div>
            <div>
              <label className="label">Saved So Far</label>
              <input type="number" className="input" {...register('currentAmount', { min: { value: 0, message: 'Cannot be negative' } })} />
              {errors.currentAmount && <p className="text-danger-500 text-sm mt-1">{errors.currentAmount.message}</p>}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Update this any time to log progress — no need to edit anything else.
              </p>
            </div>
          </div>

          <div>
            <label className="label">Target Date</label>
            <input type="date" className="input" {...register('targetDate', { required: 'Target date is required' })} />
            {errors.targetDate && <p className="text-danger-500 text-sm mt-1">{errors.targetDate.message}</p>}
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} {...register('notes')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Goal'}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default GoalsPage;
