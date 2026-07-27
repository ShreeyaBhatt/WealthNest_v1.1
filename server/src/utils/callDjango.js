/**
 * src/utils/callDjango.js — Calling Django Safely
 *
 * Translates axios errors (which errorHandler.js can't read — it only
 * understands err.statusCode) into a clear AppError: Django's real
 * message when it responds with one, or "unavailable" when it can't be
 * reached at all.
 */

const axios = require('axios');
const { AppError } = require('../middleware/errorHandler');

const callDjango = async (path, payload, axiosConfig = {}) => {
  try {
    return await axios.post(`${process.env.DJANGO_URL}${path}`, payload, axiosConfig);
  } catch (err) {
    if (err.response) {
      // Buffer when the caller used responseType: 'arraybuffer' (the PDF report endpoint).
      let data = err.response.data;
      if (Buffer.isBuffer(data)) {
        try {
          data = JSON.parse(data.toString('utf-8'));
        } catch {
          data = {};
        }
      }
      throw new AppError(data?.message || 'The AI service rejected this request', err.response.status);
    }
    throw new AppError('The AI service is currently unavailable — please try again later', 503);
  }
};

module.exports = { callDjango };
