/**
 * src/api/reports.js — Calls to /api/reports/*
 */

import api from './axios';

// responseType: 'blob' — the response is PDF bytes, not JSON, so axios
// shouldn't try to parse it as text.
export const downloadPortfolioReport = () =>
  api.get('/reports/portfolio', { responseType: 'blob' }).then((res) => res.data);
