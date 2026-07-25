/**
 * src/middleware/upload.js — Multer Config for Avatar Uploads
 *
 * Multer is the standard Express middleware for handling
 * "multipart/form-data" requests — i.e. file uploads. A normal
 * express.json() body parser can't read file data at all, which is
 * why file uploads need their own middleware.
 *
 * diskStorage tells Multer exactly where to save the file and what to
 * name it (by default it picks a random name with no extension, which
 * isn't very useful).
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const AVATAR_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');

if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AVATAR_DIR);
  },
  filename: (req, file, cb) => {
    // e.g. 64f1c2.../1719999999999.jpg — user id + timestamp keeps
    // filenames unique even if two people upload "photo.jpg" at once.
    const uniqueName = `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Only accept actual image files, and cap the size so nobody can fill
// up the server's disk with a huge upload.
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

module.exports = upload;
