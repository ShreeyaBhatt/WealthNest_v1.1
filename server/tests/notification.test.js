/**
 * tests/notification.test.js — Rebalance-alert tests
 *
 * WHY mock callDjango instead of hitting a real Django server?
 * checkRebalanceAlert (utils/notify.js) asks Django's /api/recommend/
 * endpoint whether a family's portfolio has drifted. Tests shouldn't
 * depend on Django actually running — mocking callDjango lets us test
 * Node's own logic (the cooldown window, the age/income guard, "don't
 * crash the endpoint if Django is unreachable") completely on its own.
 */

const request = require('supertest');
const app = require('../src/app');
const Notification = require('../src/models/Notification.model');
const { connectTestDB, clearTestDB, closeTestDB } = require('./db');

// Everything under src/utils/callDjango.js becomes a jest.fn() we
// control per test — see individual tests below for how each one sets
// up what "Django" should respond with.
jest.mock('../src/utils/callDjango');
const { callDjango } = require('../src/utils/callDjango');

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
  jest.clearAllMocks();
});

afterAll(async () => {
  await closeTestDB();
});

/**
 * Registers a user WITH age/income set (checkRebalanceAlert needs both
 * before it will even ask Django anything), creates their family, and
 * adds one investment so there's something to evaluate.
 */
const setUpFamilyWithInvestment = async (email) => {
  const registerRes = await request(app).post('/api/auth/register').send({
    name: 'Family Head',
    email,
    password: 'password123',
    age: 35,
    income: 80000,
  });
  const { accessToken } = registerRes.body.data;

  await request(app)
    .post('/api/families')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: `${email}'s Family` });

  await request(app)
    .post('/api/investments')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: 'All-In Stocks',
      category: 'stock',
      amount: 100000,
      currentValue: 100000,
      purchaseDate: '2024-01-01',
    });

  return accessToken;
};

describe('GET /api/notifications — rebalance alert', () => {
  it('creates a rebalance_alert notification when Django reports drift', async () => {
    callDjango.mockResolvedValue({
      data: { data: { recommendations: [{ category: 'equity', action: 'decrease', reason: 'You are overweight in equity.' }] } },
    });

    const accessToken = await setUpFamilyWithInvestment('drifted@example.com');

    await request(app).get('/api/notifications').set('Authorization', `Bearer ${accessToken}`);

    const alerts = await Notification.find({ type: 'rebalance_alert' });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toContain('overweight in equity');
  });

  it('creates no notification when Django reports the portfolio is balanced', async () => {
    callDjango.mockResolvedValue({ data: { data: { recommendations: [] } } });

    const accessToken = await setUpFamilyWithInvestment('balanced@example.com');

    await request(app).get('/api/notifications').set('Authorization', `Bearer ${accessToken}`);

    const alerts = await Notification.find({ type: 'rebalance_alert' });
    expect(alerts).toHaveLength(0);
  });

  it('does not send a second alert within the cooldown window', async () => {
    callDjango.mockResolvedValue({
      data: { data: { recommendations: [{ category: 'equity', action: 'decrease', reason: 'Overweight.' }] } },
    });

    const accessToken = await setUpFamilyWithInvestment('repeatvisit@example.com');

    // Two page loads in a row — checkRebalanceAlert runs on every one.
    await request(app).get('/api/notifications').set('Authorization', `Bearer ${accessToken}`);
    await request(app).get('/api/notifications').set('Authorization', `Bearer ${accessToken}`);

    const alerts = await Notification.find({ type: 'rebalance_alert' });
    expect(alerts).toHaveLength(1);
  });

  it('skips the check (and never calls Django) when the head has no age/income set', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'No Profile Yet',
      email: 'noprofile@example.com',
      password: 'password123',
      // age/income deliberately omitted
    });
    const { accessToken } = registerRes.body.data;

    await request(app)
      .post('/api/families')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: "No Profile's Family" });

    await request(app).get('/api/notifications').set('Authorization', `Bearer ${accessToken}`);

    expect(callDjango).not.toHaveBeenCalled();
  });

  it('does not break the notifications endpoint if Django is unreachable', async () => {
    callDjango.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const accessToken = await setUpFamilyWithInvestment('djangodown@example.com');

    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    const alerts = await Notification.find({ type: 'rebalance_alert' });
    expect(alerts).toHaveLength(0);
  });
});
