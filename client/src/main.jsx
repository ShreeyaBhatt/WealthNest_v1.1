/**
 * src/main.jsx — React Application Entry Point
 *
 * WHY is this the entry point?
 * Vite (and the browser) starts from index.html → loads main.jsx via <script>.
 * main.jsx creates the React app and "mounts" it inside <div id="root">.
 *
 * The Provider wraps the whole app so Redux store is accessible everywhere.
 * The BrowserRouter enables React Router navigation.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App';
import { store } from './redux/store';
import { ConfirmDialogProvider } from './context/ConfirmDialogContext';
import './index.css';

// ReactDOM.createRoot is the React 18 way to render an app
// (replaces the older ReactDOM.render)
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode runs components twice in development to detect side effects
  // It's removed automatically in production builds
  <React.StrictMode>
    {/* Redux Provider — makes the store available to ALL components */}
    <Provider store={store}>
      {/* BrowserRouter — enables client-side routing without page reloads */}
      <BrowserRouter>
        {/* ConfirmDialogProvider — lets any page pop up a "are you sure?" dialog, see context/ConfirmDialogContext.jsx */}
        <ConfirmDialogProvider>
          <App />
        </ConfirmDialogProvider>
        {/* Toaster — renders toast notifications anywhere in the app */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
            },
            success: {
              style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
            },
            error: {
              style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
            },
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
