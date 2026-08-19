/**
 * tests/db.js — Shared MongoDB Connection Helpers for Tests
 *
 * WHY a separate file for this?
 * Every test file needs to connect to a database, clean it between
 * tests, and disconnect when it's done. Instead of copy-pasting that
 * connection logic into every *.test.js file, we write it once here
 * and import it wherever it's needed.
 *
 * WHY a "_test" database instead of the real one?
 * Tests create/delete users, families, and investments constantly —
 * if they ran against the same MongoDB database you use while
 * developing (`wealthnest`), running the test suite would wipe out
 * your real data. So we connect to a completely separate database
 * (`wealthnest_test`) on the SAME local MongoDB server instead. Since
 * MongoDB creates databases automatically the first time something is
 * written to them, we don't need to set this up by hand anywhere.
 */

const mongoose = require('mongoose');

// Load the same .env file the real app uses, so JWT_SECRET and friends
// are available — but we still override MONGO_URI below so tests never
// touch the real database even if .env points somewhere unexpected.
require('dotenv').config();

const baseUri = process.env.MONGO_URI || 'mongodb://localhost:27017/wealthnest';
const TEST_MONGO_URI = `${baseUri}_test`;

/**
 * connectTestDB — opens the Mongoose connection to the test database.
 * Call this once in a `beforeAll` block at the top of each test file.
 */
const connectTestDB = async () => {
  await mongoose.connect(TEST_MONGO_URI);
};

/**
 * clearTestDB — empties every collection without dropping the database
 * itself. Call this in `afterEach` so every test starts with a blank
 * slate and tests can't accidentally leak data into one another.
 */
const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const collectionName in collections) {
    await collections[collectionName].deleteMany({});
  }
};

/**
 * closeTestDB — drops the whole test database and closes the
 * connection. Call this once in `afterAll` so nothing is left running
 * after the test file finishes (and Jest can exit cleanly).
 */
const closeTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

module.exports = { connectTestDB, clearTestDB, closeTestDB };
