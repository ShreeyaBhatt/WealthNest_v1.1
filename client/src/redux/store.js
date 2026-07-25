/**
 * src/redux/store.js — Redux Store Configuration
 *
 * WHY Redux Toolkit?
 * Redux manages "global state" — data shared across many components.
 * Example: The logged-in user's info needs to be accessible on the
 * dashboard, navbar, profile page, etc. Without Redux, you'd have to
 * pass it as props through every component (called "prop drilling").
 *
 * Redux Toolkit (RTK) is the modern, simplified version of Redux.
 * It removes a LOT of boilerplate code from traditional Redux.
 *
 * Store Structure:
 * store = {
 *   auth:          { user, token, isAuthenticated }
 *   investments:   { list, loading, error }
 *   family:        { data, members, loading }
 *   dashboard:     { stats, loading }
 *   notifications: { items, unreadCount }
 *   ui:            { theme, sidebarOpen }
 * }
 */

import { configureStore } from '@reduxjs/toolkit';

import uiReducer from './slices/uiSlice';
import authReducer from './slices/authSlice';

// Phase 7 note: investments/family/dashboard/notifications deliberately do
// NOT get their own Redux slices. Only auth/ui are truly needed in many
// unrelated places at once (navbar, sidebar, every protected route). The
// rest is page-specific data — each page fetches its own data with
// useState + useEffect, which is simpler to read than wiring up an async
// thunk + slice + selector for every single resource.
export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
  },

  // Redux DevTools Extension works automatically in development
  // Install the browser extension to inspect state changes in real-time
  devTools: process.env.NODE_ENV !== 'production',
});

// Types are only needed for TypeScript — we're using JavaScript
export default store;
