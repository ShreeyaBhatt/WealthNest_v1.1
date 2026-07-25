/**
 * src/pages/ProfilePage.jsx
 */

import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { updateMe, uploadAvatar } from '../api/auth';
import { selectCurrentUser, updateUser } from '../redux/slices/authSlice';

const RISK_PROFILES = ['conservative', 'moderate', 'aggressive'];
const GOALS = ['wealth_creation', 'retirement', 'education', 'home_purchase', 'emergency_fund'];

// VITE_API_URL is "http://localhost:5000/api" — avatars are served from
// the server's root (see server/src/app.js's /uploads static route),
// so we strip the "/api" suffix to get back to the server's origin.
const SERVER_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const ProfilePage = () => {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const [uploading, setUploading] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: user.name,
      phone: user.phone || '',
      age: user.age || '',
      income: user.income || '',
      riskProfile: user.riskProfile,
      investmentGoal: user.investmentGoal,
    },
  });

  const onSubmit = async (formData) => {
    try {
      const res = await updateMe({
        ...formData,
        age: formData.age ? Number(formData.age) : undefined,
        income: formData.income ? Number(formData.income) : undefined,
      });
      dispatch(updateUser(res.data));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadAvatar(file);
      dispatch(updateUser(res.data));
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-lg animate-fade-in">
      <h1 className="section-title mb-6">My Profile</h1>

      <div className="card flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-700 overflow-hidden flex items-center justify-center text-2xl">
          {user.avatar ? <img src={`${SERVER_ORIGIN}${user.avatar}`} alt="Avatar" className="w-full h-full object-cover" /> : '👤'}
        </div>
        <div>
          <label className="btn-secondary text-sm cursor-pointer inline-block">
            {uploading ? 'Uploading...' : 'Change Photo'}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" {...register('name', { required: true })} />
        </div>

        <div>
          <label className="label">Email</label>
          <input className="input opacity-60" value={user.email} disabled />
        </div>

        <div>
          <label className="label">Phone</label>
          <input className="input" {...register('phone')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Age</label>
            <input type="number" className="input" {...register('age')} />
          </div>
          <div>
            <label className="label">Monthly Income</label>
            <input type="number" className="input" {...register('income')} />
          </div>
        </div>

        <div>
          <label className="label">Risk Profile</label>
          <select className="input" {...register('riskProfile')}>
            {RISK_PROFILES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Investment Goal</label>
          <select className="input" {...register('investmentGoal')}>
            {GOALS.map((g) => <option key={g} value={g}>{g.replace('_', ' ')}</option>)}
          </select>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
