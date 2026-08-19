/**
 * tests/user.test.js — Profile update tests
 *
 * Found by actually running the app (see the `run` skill session that
 * added this): leaving Phone blank on the Profile page failed to save
 * ANY profile change with a 400, including age/income — which then
 * silently broke every AI prediction feature, since those all require
 * age/income to be set first. Locking that fix in here.
 */

const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, clearTestDB, closeTestDB } = require('./db');

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

const registerUser = async (email) => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'password123' });
  return registerRes.body.data.accessToken;
};

describe('PUT /api/users/me', () => {
  it('saves age/income when phone is left blank (empty string, not omitted)', async () => {
    const accessToken = await registerUser('blankphone@example.com');

    // Same shape a real form submits: an untouched <input> sends "",
    // not undefined — this is exactly what broke before the fix.
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ age: 32, income: 75000, phone: '' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.age).toBe(32);
    expect(res.body.data.income).toBe(75000);
  });

  it('still rejects a genuinely invalid phone number', async () => {
    const accessToken = await registerUser('badphone@example.com');

    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ phone: 'not-a-phone-number' });

    expect(res.statusCode).toBe(400);
  });

  it('accepts a valid 10-digit phone number', async () => {
    const accessToken = await registerUser('goodphone@example.com');

    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ phone: '9876543210' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.phone).toBe('9876543210');
  });
});
