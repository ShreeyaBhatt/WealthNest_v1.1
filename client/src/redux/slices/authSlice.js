/**
 * src/redux/slices/authSlice.js — Who's Logged In
 *
 * WHY does auth need its own Redux slice (unlike investments/family/etc,
 * which each page just fetches for itself with useState+useEffect)?
 * Because "who is logged in" is needed almost EVERYWHERE at once — the
 * navbar, the sidebar, every protected route, the profile page. That's
 * exactly the kind of data Redux is for: state shared across many
 * components that don't have a parent/child relationship with each other.
 *
 * We also mirror the logged-in user + tokens into localStorage, because
 * src/api/axios.js (written back in Phase 1) already reads
 * accessToken/refreshToken directly from localStorage on every request.
 */

import { createSlice } from '@reduxjs/toolkit';

const storedUser = localStorage.getItem('user');

const initialState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  accessToken: localStorage.getItem('accessToken') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isAuthenticated: Boolean(localStorage.getItem('accessToken')),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * setCredentials — called right after a successful login/register.
     * Saves everything to Redux AND localStorage.
     */
    setCredentials: (state, action) => {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    },

    /**
     * updateUser — called after editing the profile, so the navbar/etc.
     * show the new name/avatar immediately without a full page reload.
     */
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(state.user));
    },

    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;

      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
  },
});

export const { setCredentials, updateUser, logout } = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;

export default authSlice.reducer;
