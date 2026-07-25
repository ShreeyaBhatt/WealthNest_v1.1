/**
 * src/utils/email.js — Sending Emails with Nodemailer
 *
 * WHY?
 * The "forgot password" flow needs to email a reset link.
 *
 * DEV NOTE:
 * Real email sending needs a Gmail address + "App Password" in
 * EMAIL_USER / EMAIL_PASS (see server/.env.example). While you're
 * developing, it's normal to leave those blank — in that case we just
 * print the link to the console instead of actually sending an email,
 * so you can still test the feature by copy-pasting the link.
 */

const nodemailer = require('nodemailer');

/**
 * sendResetEmail — emails a password-reset link to the user.
 * rawToken is the plain, un-hashed token (the hashed version is what
 * gets stored in the database, in User.resetPasswordToken).
 */
const sendResetEmail = async (to, rawToken) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const link = `${clientUrl}/reset-password?token=${rawToken}`;
  const subject = 'WealthNest — Reset Your Password';
  const text = `You requested a password reset. This link expires in 15 minutes:\n\n${link}\n\nIf you didn't request this, you can ignore this email.`;

  // No email credentials configured — just log the link so it's still testable.
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[email] (dev mode, no credentials set) To: ${to}\n${text}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
  } catch (err) {
    // Don't let a broken email setup crash the "forgot password" request —
    // just fall back to logging the link, same as the no-credentials case.
    console.error('[email] Failed to send reset email:', err.message);
    console.log(`[email] (fallback) To: ${to}\n${text}`);
  }
};

module.exports = { sendResetEmail };
