/**
 * src/api/transactions.js — Calls to /api/transactions
 */

import api from './axios';

export const getTransactions = (investmentId) =>
  api.get('/transactions', { params: { investment: investmentId } }).then((res) => res.data);

export const createTransaction = (formData) =>
  api.post('/transactions', formData).then((res) => res.data);
