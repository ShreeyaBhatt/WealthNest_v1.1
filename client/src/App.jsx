/**
 * src/App.jsx — Root Application Component
 *
 * Phase 7: full routing. Public pages (/, /login, /register) render
 * directly. Every other page is nested under one <Route element={<Layout/>}>
 * wrapped in <ProtectedRoute> — Layout renders <Outlet/> for whichever
 * nested route matched, so Navbar/Sidebar only need to be written once.
 */

import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectTheme } from './redux/slices/uiSlice';

import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import InvestmentsPage from './pages/InvestmentsPage';
import InvestmentDetailPage from './pages/InvestmentDetailPage';
import FamilyPage from './pages/FamilyPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import ReportsPage from './pages/ReportsPage';

function App() {
  // Dark mode now comes from Redux (ui slice) instead of reading
  // localStorage directly — uiSlice already keeps localStorage in sync
  // whenever toggleTheme/setTheme runs, so this just applies it on load.
  const theme = useSelector(selectTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Routes — all share the Navbar/Sidebar shell */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/investments" element={<InvestmentsPage />} />
        <Route path="/investments/:id" element={<InvestmentDetailPage />} />
        <Route path="/family" element={<FamilyPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/ai-assistant" element={<AIAssistantPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
      </Route>

      {/* 404 — redirect unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
