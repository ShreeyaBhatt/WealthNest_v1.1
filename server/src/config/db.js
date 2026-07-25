/**
 * src/config/db.js — MongoDB Connection Configuration
 *
 * WHY Mongoose?
 * MongoDB is a "schema-less" database — you can store any shape of document.
 * Mongoose adds a "schema" layer on top, letting you define what fields
 * an investment or user document should have, with validation.
 *
 * Think of Mongoose as the "ORM" for MongoDB (like Sequelize is for SQL).
 */

const mongoose = require('mongoose');

/**
 * connectDB — Connects to MongoDB using the URI from environment variables
 *
 * This is an async function because connecting to a database takes time
 * (it's a network operation). We use async/await to handle this cleanly.
 */
const connectDB = async () => {
  try {
    // mongoose.connect() returns a promise — we await it
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options prevent deprecation warnings
      // useNewUrlParser and useUnifiedTopology are the modern defaults
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);

  } catch (error) {
    // If connection fails, log the error and exit
    // process.exit(1) means "exit with an error" (0 = success, 1 = error)
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

// ─── Mongoose Connection Event Listeners ─────────────────────
// These fire during the lifecycle of the DB connection

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

module.exports = connectDB;
