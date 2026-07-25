/**
 * src/api/users.js — Calls to /api/users (admin-only list)
 */

import api from './axios';

export const getAllUsers = (params = {}) =>
  api.get('/users', { params }).then((res) => res.data);
