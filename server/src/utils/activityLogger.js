/**
 * src/utils/activityLogger.js — A Tiny Activity Log Using Node's
 * Built-in `events` and `fs` Modules
 *
 * WHY EventEmitter?
 * Instead of every controller directly opening a file and writing to
 * it (which would mean repeating the same file-writing code
 * everywhere), controllers just "announce" that something happened —
 * activityLogger.emit('activity', 'User registered: ...') — and this
 * one place is the only code that actually touches the filesystem.
 * That's the whole point of EventEmitter: it decouples "something
 * happened" from "here's what to do about it".
 *
 * WHY fs.appendFile instead of fs.writeFile?
 * appendFile adds to the end of the file without erasing what's
 * already there — exactly what a log file needs. We use the async
 * (Promise-based) version so a slow disk write never blocks the
 * request that triggered it.
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'activity.log');

// Make sure logs/ exists before we ever try to write to it.
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const activityLogger = new EventEmitter();

activityLogger.on('activity', (message) => {
  const line = `[${new Date().toISOString()}] ${message}\n`;

  fs.promises.appendFile(LOG_FILE, line).catch((err) => {
    // A logging failure should never crash the request that triggered it.
    console.error('[activityLogger] Could not write to log file:', err.message);
  });
});

module.exports = activityLogger;
