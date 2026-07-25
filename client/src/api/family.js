/**
 * src/api/family.js — Calls to /api/families/*
 */

import api from './axios';

export const getMyFamily = () => api.get('/families').then((res) => res.data);
export const createFamily = (formData) => api.post('/families', formData).then((res) => res.data);
export const updateFamily = (formData) => api.put('/families', formData).then((res) => res.data);
export const addMember = (formData) => api.post('/families/members', formData).then((res) => res.data);
export const updateMember = (memberId, formData) =>
  api.put(`/families/members/${memberId}`, formData).then((res) => res.data);
export const removeMember = (memberId) => api.delete(`/families/members/${memberId}`).then((res) => res.data);
