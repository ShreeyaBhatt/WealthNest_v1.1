/**
 * src/api/chat.js — Calls to /api/chat
 */

import api from './axios';

export const getChatHistory = () => api.get('/chat').then((res) => res.data);
export const sendMessage = (message) => api.post('/chat', { message }).then((res) => res.data);
