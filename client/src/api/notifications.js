/**
 * src/api/notifications.js — Calls to /api/notifications/*
 */

import api from './axios';

export const getNotifications = (params = {}) =>
  api.get('/notifications', { params }).then((res) => res.data);

export const markAsRead = (id) =>
  api.patch(`/notifications/${id}/read`).then((res) => res.data);
