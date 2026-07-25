/**
 * src/api/investments.js — Calls to /api/investments/*
 */

import api from './axios';

// `params` can include { category, owner, search, page, limit }
export const getInvestments = (params = {}) =>
  api.get('/investments', { params }).then((res) => res.data);

export const getInvestment = (id) =>
  api.get(`/investments/${id}`).then((res) => res.data);

export const createInvestment = (formData) =>
  api.post('/investments', formData).then((res) => res.data);

export const updateInvestment = (id, formData) =>
  api.put(`/investments/${id}`, formData).then((res) => res.data);

export const deleteInvestment = (id) =>
  api.delete(`/investments/${id}`).then((res) => res.data);
