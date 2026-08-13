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
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: user.name,
      phone: user.phone || '',
      age: user.age || '',
      income: user.income || '',
      riskProfile: user.riskProfile,
      investmentGoal: user.investmentGoal,
    },
  });

  // Live preview chip next to the Risk Profile select — reflects
  // whatever's currently chosen, even before Save is clicked.
  const selectedRiskProfile = watch('riskProfile');

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
    <div className="max-w-2xl animate-fade-in">
      <h1 className="section-title mb-6">My Profile</h1>

      <div className="card flex items-center gap-4 mb-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-dark-700 overflow-hidden flex items-center justify-center text-3xl ring-2 ring-gold-400 ring-offset-2 ring-offset-white dark:ring-offset-dark-800">
          {user.avatar ? <img src={`${SERVER_ORIGIN}${user.avatar}`} alt="Avatar" className="w-full h-full object-cover" /> : '👤'}
        </div>
        <div>
          <label className="btn-secondary text-sm cursor-pointer inline-block">
            {uploading ? 'Uploading...' : 'Change Photo'}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
            Personal Info
          </h2>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Name</label>
                <input className="input" {...register('name', { required: true })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input opacity-60" value={user.email} disabled />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  {...register('phone', { pattern: { value: /^[0-9]{10}$/, message: 'Phone must be a valid 10-digit number' } })}
                />
                {errors.phone && <p className="text-danger-500 text-sm mt-1">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="label">Age</label>
                <input
                  type="number"
                  className="input"
                  {...register('age', { min: { value: 18, message: 'Age must be between 18 and 100' }, max: { value: 100, message: 'Age must be between 18 and 100' } })}
                />
                {errors.age && <p className="text-danger-500 text-sm mt-1">{errors.age.message}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-dark-700 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
            Investment Preferences
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Monthly Income</label>
              <input
                type="number"
                className="input"
                {...register('income', { min: { value: 0, message: 'Income cannot be negative' } })}
              />
              {errors.income && <p className="text-danger-500 text-sm mt-1">{errors.income.message}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-2">
                  Risk Profile
                  {selectedRiskProfile && <span className="badge-gold">{selectedRiskProfile}</span>}
                </label>
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
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
