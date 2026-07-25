/**
 * src/pages/LoginPage.jsx
 *
 * Uses react-hook-form to manage the form fields + validation instead
 * of writing a useState for every single input — react-hook-form keeps
 * each keystroke from re-rendering the whole form, and gives us
 * `errors` for free after calling `register('email', { required: ... })`.
 */

import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { login } from '../api/auth';
import { setCredentials } from '../redux/slices/authSlice';

const LoginPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [submitting, setSubmitting] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit = async (formData) => {
    setSubmitting(true);
    try {
      const res = await login(formData);
      dispatch(setCredentials(res.data));
      toast.success('Welcome back!');
      // If ProtectedRoute redirected here from somewhere, go back there.
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900 px-4">
      <div className="card w-full max-w-md animate-fade-in">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">💰</div>
          <h1 className="text-2xl font-bold gradient-text">WealthNest</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Log in to your family portfolio</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && <p className="text-danger-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              {...register('password', { required: 'Password is required' })}
            />
            {errors.password && <p className="text-danger-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          New here?{' '}
          <Link to="/register" className="text-primary-600 dark:text-primary-400 font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
