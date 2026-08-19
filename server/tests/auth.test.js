/**
 * tests/auth.test.js — Register / Login / Protected-route tests
 *
 * WHY test this file first?
 * auth.controller.js is the gateway to everything else in the app —
 * if register/login silently broke, every other feature would break
 * along with it, but maybe not in a way that's obvious right away.
 * These are the highest-value tests to have in the whole project.
 *
 * WHY supertest?
 * supertest lets us make real HTTP requests (GET/POST/etc.) against
 * our Express `app` object WITHOUT actually starting a server on a
 * port. That's exactly why server.js and app.js are split — see the
 * comment at the top of server.js.
 */

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User.model');
const { connectTestDB, clearTestDB, closeTestDB } = require('./db');

// Runs once before any test in this file — opens the DB connection.
beforeAll(async () => {
  await connectTestDB();
});

// Runs after EVERY test — wipes the database so tests never see
// leftover data from a previous test.
afterEach(async () => {
  await clearTestDB();
});

// Runs once after all tests in this file finish — closes the connection.
afterAll(async () => {
  await closeTestDB();
});

// A valid user we can reuse across multiple tests below.
const validUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
};

describe('POST /api/auth/register', () => {
  it('creates a new user and returns tokens', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();

    // The password should NEVER be sent back in the response body —
    // User.model.js sets `select: false` on it, so this also doubles
    // as a check that nobody accidentally overrode that.
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('rejects registering the same email twice', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects a password shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, password: '123' });

    expect(res.statusCode).toBe(400);
  });

  it('rejects a missing name', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.statusCode).toBe(400);
  });

  it('actually hashes the password before saving it', async () => {
    await request(app).post('/api/auth/register').send(validUser);

    // password has `select: false` in the schema, so we have to ask
    // for it explicitly here, same as auth.controller.js does.
    const stored = await User.findOne({ email: validUser.email }).select('+password');
    expect(stored.password).not.toBe(validUser.password);
  });
});

describe('POST /api/auth/login', () => {
  // Every test in this block needs an already-registered user first.
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(validUser);
  });

  it('logs in with the correct email and password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('rejects the wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'totally-wrong-password' });

    expect(res.statusCode).toBe(401);
  });

  it('rejects an email that was never registered', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.statusCode).toBe(401);
  });

  // Same status code and message on purpose, per the comment in
  // auth.controller.js — this test locks that behavior in.
  it('gives the same error for "wrong password" and "unknown email"', async () => {
    const wrongPasswordRes = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'nope' });

    const unknownEmailRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'nope' });

    expect(wrongPasswordRes.statusCode).toBe(unknownEmailRes.statusCode);
    expect(wrongPasswordRes.body.message).toBe(unknownEmailRes.body.message);
  });
});

describe('Protected routes (middleware/auth.js)', () => {
  it('blocks a request with no Authorization header at all', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.statusCode).toBe(401);
  });

  it('blocks a request with a garbage/made-up token', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer this-is-not-a-real-token');

    expect(res.statusCode).toBe(401);
  });

  it('allows the request through with a real token from registration', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(validUser);
    const { accessToken } = registerRes.body.data;

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe(validUser.email);
  });
});
