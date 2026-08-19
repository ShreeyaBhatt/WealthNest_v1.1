/**
 * src/api/goals.js — Calls to /api/goals/*
 */

import api from './axios';

export const getGoals = () => api.get('/goals').then((res) => res.data);

export const getGoal = (id) => api.get(`/goals/${id}`).then((res) => res.data);

export const createGoal = (formData) => api.post('/goals', formData).then((res) => res.data);

export const updateGoal = (id, formData) => api.put(`/goals/${id}`, formData).then((res) => res.data);

export const deleteGoal = (id) => api.delete(`/goals/${id}`).then((res) => res.data);
