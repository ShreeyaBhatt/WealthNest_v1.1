/**
 * src/api/dashboard.js — Calls to /api/dashboard and /api/predictions/*
 */

import api from './axios';

export const getDashboard = () => api.get('/dashboard').then((res) => res.data);
export const getRiskPrediction = () => api.get('/predictions/risk').then((res) => res.data);
export const getFuturePrediction = () => api.get('/predictions/future').then((res) => res.data);
export const getRecommendations = () => api.get('/predictions/recommend').then((res) => res.data);
export const getHealthScore = () => api.get('/predictions/health-score').then((res) => res.data);
export const getAnalytics = () => api.get('/analytics').then((res) => res.data);
export const getPortfolioHistory = () => api.get('/dashboard/history').then((res) => res.data);
