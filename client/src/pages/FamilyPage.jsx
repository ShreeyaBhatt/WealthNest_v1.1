/**
 * src/pages/FamilyPage.jsx
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { FiUserPlus } from 'react-icons/fi';

import { getMyFamily, createFamily, inviteMember } from '../api/family';
import { getDashboard } from '../api/dashboard';
import { selectCurrentUser } from '../redux/slices/authSlice';
import Avatar from '../components/Avatar';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

const FamilyPage = () => {
  const [family, setFamily] = useState(null);
  const [memberValues, setMemberValues] = useState({}); // { name: portfolioValue } — from dashboard's memberBreakdown
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const user = useSelector(selectCurrentUser);

  const createForm = useForm();
  const inviteForm = useForm();

  const loadFamily = async () => {
    setLoading(true);
    try {
      const res = await getMyFamily();
      setFamily(res.data);

      // Reuses the same live-aggregated numbers the Dashboard shows —
      // no separate "family portfolio" endpoint needed.
      const dashboardRes = await getDashboard().catch(() => null);
      if (dashboardRes) setMemberValues(dashboardRes.data.memberBreakdown);
    } catch (err) {
      // 404 just means "no family yet" — not a real error, show the create form instead.
      if (err.response?.status !== 404) {
        toast.error(err.response?.data?.message || 'Could not load family');
      }
      setFamily(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (formData) => {
    try {
      await createFamily(formData);
      toast.success('Family created!');
      window.location.reload(); // role changed to family_head — simplest way to refresh everywhere
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create family');
    }
  };

  const handleInvite = async (formData) => {
    setInviting(true);
    try {
      await inviteMember(formData.email);
      toast.success('Invitation sent');
      inviteForm.reset();
      loadFamily();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send invite');
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <div className="skeleton h-64 w-full rounded-2xl" />;

  if (!family) {
    return (
      <div className="max-w-md mx-auto card animate-fade-in">
        <h1 className="section-title mb-4">Create Your Family</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          You're not part of a family yet. Create one to start tracking investments together.
        </p>
        <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
          <div>
            <label className="label">Family Name</label>
            <input className="input" {...createForm.register('name', { required: true })} />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <input className="input" {...createForm.register('description')} />
          </div>
          <button type="submit" className="btn-primary w-full">Create Family</button>
        </form>
      </div>
    );
  }

  const canInvite = user.role === 'admin' || user.role === 'family_head';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">{family.name}</h1>
          {family.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{family.description}</p>
          )}
        </div>
        {canInvite && (
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => document.getElementById('invite-form')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <FiUserPlus /> Add Member
          </button>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Members ({family.members.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {family.members.map((member) => (
            <div key={member._id} className="card flex items-center gap-4">
              <Avatar name={member.name} size="lg" />
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{member.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="badge-gray">{member.role.replace('_', ' ')}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {formatCurrency(memberValues[member.name])}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {canInvite && (
        <div id="invite-form" className="card max-w-md">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Invite a Member</h2>
          <form onSubmit={inviteForm.handleSubmit(handleInvite)} className="flex gap-3">
            <input
              type="email"
              className="input"
              placeholder="member@example.com"
              {...inviteForm.register('email', { required: true })}
            />
            <button type="submit" className="btn-primary shrink-0" disabled={inviting}>
              {inviting ? 'Sending...' : 'Invite'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default FamilyPage;
