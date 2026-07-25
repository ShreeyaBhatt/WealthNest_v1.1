/**
 * src/api/auth.js — Calls to /api/auth/* and /api/users/*
 *
 * Every function here just wraps one backend endpoint and returns the
 * response body ({ success, message, data }) — keeping this in one
 * file means pages never need to remember the exact URL or method.
 */

import api from './axios';

export const register = (formData) => api.post('/auth/register', formData).then((res) => res.data);
export const login = (formData) => api.post('/auth/login', formData).then((res) => res.data);
export const logout = () => api.post('/auth/logout').then((res) => res.data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email }).then((res) => res.data);
export const resetPassword = (token, newPassword) =>
  api.post('/auth/reset-password', { token, newPassword }).then((res) => res.data);

export const getMe = () => api.get('/users/me').then((res) => res.data);
export const updateMe = (formData) => api.put('/users/me', formData).then((res) => res.data);

// File uploads need "multipart/form-data", not JSON — FormData handles
// that encoding for us; we just have to set the header explicitly here
// since the shared axios instance defaults to 'application/json'.
export const uploadAvatar = (file) => {
  const formData = new FormData();
  formData.append('avatar', file);
  return api
    .put('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.data);
};
