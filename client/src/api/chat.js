/**
 * src/api/chat.js — Calls to /api/chat
 */

import api from './axios';

// The list of past conversations, for the "Continue Chat" picker.
export const getChatSessions = () => api.get('/chat/sessions').then((res) => res.data);

// Pass a sessionId to load one conversation; omit it for the old
// "everything this user has ever asked" behavior.
export const getChatHistory = (sessionId) =>
  api.get('/chat', { params: sessionId ? { sessionId } : {} }).then((res) => res.data);

// Pass a sessionId to continue that conversation; omit it to start a
// new one (the server mints a fresh sessionId and returns it).
export const sendMessage = (message, sessionId) =>
  api.post('/chat', { message, ...(sessionId ? { sessionId } : {}) }).then((res) => res.data);
