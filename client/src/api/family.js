/**
 * src/api/family.js — Calls to /api/families/*
 */

import api from './axios';

export const getMyFamily = () => api.get('/families').then((res) => res.data);
export const createFamily = (formData) => api.post('/families', formData).then((res) => res.data);
export const inviteMember = (email) => api.post('/families/invite', { email }).then((res) => res.data);
export const updateFamily = (formData) => api.put('/families', formData).then((res) => res.data);
export const removeMember = (userId) => api.delete(`/families/members/${userId}`).then((res) => res.data);
export const cancelInvite = (email) =>
  api.delete(`/families/invites/${encodeURIComponent(email)}`).then((res) => res.data);
