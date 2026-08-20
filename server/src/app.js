/**
 * src/app.js — Express Application Configuration
 *
 * This file sets up all middleware and routes.
 * Think of middleware as a pipeline — every request passes through
 * each middleware function in order before reaching the route handler.
 *
 * Request → helmet → cors → morgan → express.json → routes → errorHandler
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// This package makes async errors in routes automatically caught
// Without it, you'd need try-catch in every route handler
require('express-async-errors');

// ─── Import Route Files (Phase 3) ─────────────────────────────
const authRoutes        = require('./routes/auth.routes');
const userRoutes        = require('./routes/user.routes');
const familyRoutes      = require('./routes/family.routes');
const investmentRoutes  = require('./routes/investment.routes');
const goalRoutes        = require('./routes/goal.routes');
const transactionRoutes = require('./routes/transaction.routes');
const dashboardRoutes   = require('./routes/dashboard.routes');
const notificationRoutes= require('./routes/notification.routes');
const predictionRoutes  = require('./routes/prediction.routes');
const analyticsRoutes   = require('./routes/analytics.routes');
const chatRoutes        = require('./routes/chat.routes');
const reportRoutes      = require('./routes/report.routes');

// ─── Import Error Handler ────────────────────────────────────
const { errorHandler } = require('./middleware/errorHandler');

// ─── Create Express App ──────────────────────────────────────
const app = express();

// ─── Security Middleware ─────────────────────────────────────
// helmet() sets various HTTP headers to protect against common attacks
// e.g., XSS, clickjacking, MIME sniffing
// crossOriginResourcePolicy: false — without this, helmet blocks the
// React app (running on a different port/origin) from loading uploaded
// avatar images from /uploads below.
app.use(helmet({ crossOriginResourcePolicy: false }));

// ─── CORS Configuration ──────────────────────────────────────
// CORS = Cross-Origin Resource Sharing
// This allows your React app (localhost:3000) to call this API (localhost:5000)
// Without CORS, browsers block cross-origin requests for security
//
// CLIENT_URL is typed by hand into Render's dashboard, and a browser's
// Origin header NEVER has a trailing slash — so a stray "...onrender.com/"
// instead of "...onrender.com" would silently fail every single request
// with a CORS error and no obvious clue why. Stripping it here removes
// that whole class of mistake. Comma-separate multiple URLs (e.g. a
// custom domain alongside the *.onrender.com one) same as Django's
// CORS_ALLOWED_ORIGINS already does.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''));

app.use(cors({
  origin: allowedOrigins,
  credentials: true,  // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// ─── Rate Limiting ───────────────────────────────────────────
// Prevents abuse — limits each IP to 100 requests per 15 minutes
// This protects against brute-force attacks and DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes in milliseconds
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ─── Body Parser ─────────────────────────────────────────────
// Allows Express to read JSON request bodies
// Without this, req.body would be undefined
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── HTTP Request Logger ─────────────────────────────────────
// morgan logs: "GET /api/auth/login 200 45ms"
// 'dev' format is colorful and concise — perfect for development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Uploaded Files (avatars) ─────────────────────────────────
// Anything saved to server/uploads/ by Multer (see middleware/upload.js)
// becomes reachable at http://localhost:5000/uploads/<path>.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Health Check Route ───────────────────────────────────────
// Simple endpoint to verify the server is running
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WealthNest Server is running 🚀',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/families',      familyRoutes);
app.use('/api/investments',   investmentRoutes);
app.use('/api/goals',         goalRoutes);
app.use('/api/transactions',  transactionRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/predictions',   predictionRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/reports',       reportRoutes);

// ─── 404 Handler ─────────────────────────────────────────────
// If no route matched, send a 404 response
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ────────────────────────────────────
// This catches ALL errors thrown in routes/middleware
// Centralized error handling = consistent error responses
app.use(errorHandler);

module.exports = app;
