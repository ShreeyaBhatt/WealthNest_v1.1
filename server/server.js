/**
 * server.js — WealthNest Entry Point
 *
 * WHY a separate server.js and app.js?
 * - app.js configures the Express application (middleware, routes)
 * - server.js starts the HTTP server and connects to MongoDB
 * This separation makes testing easier — you can import app.js in tests
 * without actually starting a server.
 */

// Load environment variables FIRST before any other imports
require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');

// ─── Configuration ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── Connect to MongoDB, then Start Server ────────────────────
// We connect to DB first — if DB fails, there's no point starting the server
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`  💰 WealthNest Server Started`);
      console.log(`  🌍 Environment : ${NODE_ENV}`);
      console.log(`  🚀 Port        : ${PORT}`);
      console.log(`  🔗 URL         : http://localhost:${PORT}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    // ─── Graceful Shutdown ────────────────────────────────────
    // When you press Ctrl+C, close the server cleanly
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed.');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);  // Exit with error code
  }
};

startServer();
