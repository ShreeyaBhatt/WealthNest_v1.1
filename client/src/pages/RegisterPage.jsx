/**
 * src/pages/RegisterPage.jsx
 *
 * Keeps registration to just name/email/password — nobody expects to
 * be asked their age and income on a signup form. Age/income are only
 * needed later for the AI risk/future-value predictions, so they're
 * collected on the Profile page instead, when the user actually wants
 * that feature (prediction.controller.js on the server already shows a
 * clear "set your age and income in your profile" message if they're
 * still missing at that point).
 *
 * Layout: a navy brand panel on the left (AuthBrandPanel, shared with
 * LoginPage) on wider screens; below `lg` that panel hides and this
 * collapses to the original single centered-card layout, so nothing
 * regresses on mobile.
 */

import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { register as registerApi } from '../api/auth';
import { setCredentials } from '../redux/slices/authSlice';
import AuthBrandPanel from '../components/AuthBrandPanel';

const RegisterPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [submitting, setSubmitting] = useState(false);
  // `submitting` (React state) is what disables the button, but state
  // updates aren't visible until the next render — a second click that
  // lands before that render commits (e.g. a fast double-click) would
  // still fire onSubmit a second time, sending two register requests.
  // This ref is checked/set synchronously, so it can't be raced like that.
  const isSubmittingRef = useRef(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onSubmit = async (formData) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await registerApi(formData);
      dispatch(setCredentials(res.data));
      toast.success('Account created!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthBrandPanel />

      <div className="flex items-center justify-center bg-gray-50 dark:bg-dark-900 px-4 py-10">
        <div className="card w-full max-w-md animate-fade-in">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2 lg:hidden">💰</div>
            <h1 className="text-2xl font-bold gradient-text">Create your account</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" {...register('name', { required: 'Name is required' })} />
              {errors.name && <p className="text-danger-500 text-sm mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Email</label>
              <input type="email" className="input" {...register('email', { required: 'Email is required' })} />
              {errors.email && <p className="text-danger-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'At least 6 characters' },
                })}
              />
              {errors.password && <p className="text-danger-500 text-sm mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-gold-600 dark:text-gold-400 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
