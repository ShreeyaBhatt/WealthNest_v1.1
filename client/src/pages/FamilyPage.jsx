/**
 * src/pages/FamilyPage.jsx
 *
 * Members here are profile records (name/email/age/phone/income) that
 * the family head manages directly — not separate logins. Only the
 * head (shown above the member grid, from family.head) has an actual
 * WealthNest account.
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { FiUserPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

import { getMyFamily, createFamily, updateFamily, addMember, updateMember, removeMember } from '../api/family';
import { getMe } from '../api/users';
import { selectCurrentUser, updateUser } from '../redux/slices/authSlice';
import { useConfirm } from '../context/ConfirmDialogContext';
import Avatar from '../components/Avatar';
import Drawer from '../components/Drawer';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

const FamilyPage = () => {
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditFamily, setShowEditFamily] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null); // null = adding new, object = editing existing

  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const confirm = useConfirm();

  const createForm = useForm();
  const editForm = useForm();
  const memberForm = useForm();

  const loadFamily = async () => {
    setLoading(true);
    try {
      const res = await getMyFamily();
      setFamily(res.data);
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

  const openAddMember = () => {
    setEditingMember(null);
    memberForm.reset({ name: '', email: '', age: '', phone: '', monthlyIncome: '' });
    setShowMemberForm(true);
  };

  const openEditMember = (member) => {
    setEditingMember(member);
    memberForm.reset({
      name: member.name,
      email: member.email,
      age: member.age ?? '',
      phone: member.phone,
      monthlyIncome: member.monthlyIncome ?? '',
    });
    setShowMemberForm(true);
  };

  const handleSubmitMember = async (formData) => {
    const payload = {
      name: formData.name,
      email: formData.email || undefined,
      age: formData.age === '' ? undefined : Number(formData.age),
      phone: formData.phone || undefined,
      monthlyIncome: formData.monthlyIncome === '' ? undefined : Number(formData.monthlyIncome),
    };

    setSaving(true);
    try {
      if (editingMember) {
        await updateMember(editingMember._id, payload);
        toast.success('Member updated');
      } else {
        await addMember(payload);
        toast.success('Member added');
      }
      setShowMemberForm(false);
      loadFamily();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save member');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const ok = await confirm(`Remove ${member.name} from ${family.name}? This can't be undone.`);
    if (!ok) return;
    try {
      await removeMember(member._id);
      toast.success('Member removed');
      loadFamily();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove member');
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
          <button className="btn-primary flex items-center gap-2" onClick={openAddMember}>
            <FiUserPlus /> Add Member
          </button>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Head of Family</h2>
        <div className="card flex items-center gap-4 max-w-sm">
          <Avatar name={family.head.name} size="lg" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{family.head.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{family.head.email}</p>
            <span className="badge-blue mt-1 inline-block">Head</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Members ({family.members.length})</h2>
        {family.members.length === 0 ? (
          <div className="card text-center py-10 text-gray-500 dark:text-gray-400">
            No members yet — click "Add Member" to add one.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {family.members.map((member) => (
              <div key={member._id} className="card flex items-start gap-4">
                <Avatar name={member.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{member.name}</p>
                  {member.email && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-300 flex-wrap">
                    {member.age != null && <span>{member.age} yrs</span>}
                    {member.phone && <span>{member.phone}</span>}
                    {member.monthlyIncome > 0 && <span>{formatCurrency(member.monthlyIncome)}/mo</span>}
                  </div>
                </div>
                {canManage && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500"
                      onClick={() => openEditMember(member)}
                      aria-label={`Edit ${member.name}`}
                    >
                      <FiEdit2 size={15} />
                    </button>
                    <button
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-danger-500"
                      onClick={() => handleRemoveMember(member)}
                      aria-label={`Remove ${member.name}`}
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Drawer
        open={showMemberForm}
        onClose={() => setShowMemberForm(false)}
        title={editingMember ? 'Edit Member' : 'Add Member'}
      >
        <form onSubmit={memberForm.handleSubmit(handleSubmitMember)} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" {...memberForm.register('name', { required: 'Name is required' })} />
          </div>
          <div>
            <label className="label">Email (optional)</label>
            <input type="email" className="input" {...memberForm.register('email')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Age (optional)</label>
              <input type="number" className="input" {...memberForm.register('age', { min: 0, max: 120 })} />
            </div>
            <div>
              <label className="label">Phone (optional)</label>
              <input className="input" {...memberForm.register('phone')} />
            </div>
          </div>
          <div>
            <label className="label">Monthly Income (optional)</label>
            <input type="number" className="input" {...memberForm.register('monthlyIncome', { min: 0 })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowMemberForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingMember ? 'Save Changes' : 'Add Member'}
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
