/**
 * src/redux/slices/uiSlice.js — UI State Slice
 *
 * WHY a dedicated UI slice?
 * UI state (dark mode, sidebar open/closed, loading states) is
 * shared across many components. Storing it in Redux means any
 * component can read or change it without prop drilling.
 *
 * HOW Redux Toolkit slices work:
 * createSlice() generates:
 * 1. Action creators (e.g., toggleTheme, toggleSidebar)
 * 2. A reducer function
 * You just define the "state shape" and "how to change it" (reducers).
 */

import { createSlice } from '@reduxjs/toolkit';

// ─── Initial State ───────────────────────────────────────────
const initialState = {
  // Theme: read from localStorage so it persists across browser sessions
  theme: localStorage.getItem('theme') || 'dark',

  // Sidebar: whether the side navigation is open or collapsed
  sidebarOpen: true,

  // Global loading overlay (used during heavy operations)
  globalLoading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,

  // Reducers define HOW the state changes
  // RTK uses Immer under the hood, so "mutating" state here is actually safe
  reducers: {
    /**
     * Toggle between 'light' and 'dark' theme
     * Also updates localStorage and the <html> class
     */
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', state.theme);

      // Apply/remove the 'dark' class on <html> for Tailwind dark mode
      if (state.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },

    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },

    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },

    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },

    setGlobalLoading: (state, action) => {
      state.globalLoading = action.payload;
    },
  },
});

// ─── Export Actions ──────────────────────────────────────────
// These are the functions components will call to update state
export const {
  toggleTheme,
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  setGlobalLoading,
} = uiSlice.actions;

// ─── Export Selectors ────────────────────────────────────────
// Selectors are functions to READ from state
// Usage in a component: const theme = useSelector(selectTheme);
export const selectTheme       = (state) => state.ui.theme;
export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectGlobalLoading = (state) => state.ui.globalLoading;

// ─── Export Reducer ──────────────────────────────────────────
// This is what gets added to the store in store.js
export default uiSlice.reducer;
