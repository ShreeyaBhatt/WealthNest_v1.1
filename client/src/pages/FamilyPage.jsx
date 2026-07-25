/**
 * src/pages/FamilyPage.jsx
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { FiUserPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

import {
  getMyFamily,
  createFamily,
  inviteMember,
  updateFamily,
  removeMember,
  cancelInvite,
} from '../api/family';
import { getDashboard } from '../api/dashboard';
import { getMe } from '../api/users';
import { selectCurrentUser, updateUser } from '../redux/slices/authSlice';
import { useConfirm } from '../context/ConfirmDialogContext';
import Avatar from '../components/Avatar';
import Drawer from '../components/Drawer';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

const FamilyPage = () => {
  const [family, setFamily] = useState(null);
  const [memberValues, setMemberValues] = useState({}); // { name: portfolioValue } — from dashboard's memberBreakdown
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [showEditFamily, setShowEditFamily] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const confirm = useConfirm();

  const createForm = useForm();
  const inviteForm = useForm();
  const editForm = useForm();

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

      // Creating a family promotes this user to family_head on the
      // server, but the Redux/localStorage copy of `user` was taken at
      // login time and never gets refreshed on its own — without this,
      // role-gated UI (like the "Add Member" button below) would stay
      // hidden until the next full login, even though the server would
      // happily accept the request.
      const me = await getMe();
      dispatch(updateUser(me.data));

      toast.success('Family created!');
      createForm.reset();
      loadFamily();
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
      setShowInvite(false);
      loadFamily();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send invite');
    } finally {
      setInviting(false);
    }
  };

  const openEditFamily = () => {
    editForm.reset({ name: family.name, description: family.description });
    setShowEditFamily(true);
  };

  const handleUpdateFamily = async (formData) => {
    try {
      await updateFamily(formData);
      toast.success('Family updated');
      setShowEditFamily(false);
      loadFamily();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update family');
    }
  };

  const handleRemoveMember = async (member) => {
    const ok = await confirm(`Remove ${member.name} from ${family.name}? They'll lose access to the family's investments.`);
    if (!ok) return;
    try {
      await removeMember(member._id);
      toast.success('Member removed');
      loadFamily();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove member');
    }
  };

  const handleCancelInvite = async (email) => {
    const ok = await confirm(`Cancel the invite to ${email}?`);
    if (!ok) return;
    try {
      await cancelInvite(email);
      toast.success('Invite cancelled');
      loadFamily();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel invite');
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

  const canManage = user.role === 'admin' || user.role === 'family_head';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="section-title">{family.name}</h1>
            {canManage && (
              <button
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500"
                onClick={openEditFamily}
                aria-label="Edit family"
              >
                <FiEdit2 size={16} />
              </button>
            )}
          </div>
          {family.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{family.description}</p>
          )}
        </div>
        {canManage && (
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowInvite(true)}
          >
            <FiUserPlus /> Add Member
          </button>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Members ({family.members.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {family.members.map((member) => {
            const isHead = String(family.head._id) === String(member._id);
            return (
              <div key={member._id} className="card flex items-center gap-4">
                <Avatar name={member.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{member.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="badge-gray">{member.role.replace('_', ' ')}</span>
                    {isHead && <span className="badge-blue">Head</span>}
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {formatCurrency(memberValues[member.name])}
                    </span>
                  </div>
                </div>
                {canManage && !isHead && (
                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-danger-500 shrink-0"
                    onClick={() => handleRemoveMember(member)}
                    aria-label={`Remove ${member.name}`}
                  >
                    <FiTrash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {canManage && family.pendingInvites?.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">
            Pending Invites ({family.pendingInvites.length})
          </h2>
          <div className="card divide-y divide-gray-100 dark:divide-dark-700">
            {family.pendingInvites.map((invite) => (
              <div key={invite.email} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-sm text-gray-700 dark:text-gray-200">{invite.email}</span>
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500"
                  onClick={() => handleCancelInvite(invite.email)}
                  aria-label={`Cancel invite to ${invite.email}`}
                >
                  <FiX size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Drawer open={showInvite} onClose={() => setShowInvite(false)} title="Invite a Member">
        <form onSubmit={inviteForm.handleSubmit(handleInvite)} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="member@example.com"
              {...inviteForm.register('email', { required: true })}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            If they already have a WealthNest account, they'll join instantly. Otherwise, we'll send
            them an email invite and they'll join automatically when they sign up.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={inviting}>
              {inviting ? 'Sending...' : 'Invite'}
            </button>
          </div>
        </form>
      </Drawer>

      <Drawer open={showEditFamily} onClose={() => setShowEditFamily(false)} title="Edit Family">
        <form onSubmit={editForm.handleSubmit(handleUpdateFamily)} className="space-y-4">
          <div>
            <label className="label">Family Name</label>
            <input className="input" {...editForm.register('name', { required: 'Name is required' })} />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" {...editForm.register('description')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowEditFamily(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default FamilyPage;
