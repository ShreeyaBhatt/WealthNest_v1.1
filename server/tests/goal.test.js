/**
 * tests/goal.test.js — Financial Goal CRUD tests
 *
 * Mirrors investment.test.js's structure and reasoning — see that
 * file's header comment. The rules worth locking in here are the same
 * shape as Investment's: "join a family first", family isolation, and
 * that updating currentAmount (the normal way of "logging progress")
 * actually moves the computed progressPercent/isAchieved virtuals.
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

const registerUserWithFamily = async (email) => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Family Head', email, password: 'password123' });

  const { accessToken, user } = registerRes.body.data;

  await request(app)
    .post('/api/families')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: `${email}'s Family` });

  return { accessToken, userId: user._id };
};

const validGoal = {
  name: 'Emergency Fund',
  category: 'emergency_fund',
  targetAmount: 100000,
  targetDate: '2027-01-01',
};

describe('POST /api/goals', () => {
  it('rejects creating a goal before joining/creating a family', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'No Family Yet', email: 'nofamilygoal@example.com', password: 'password123' });
    const { accessToken } = registerRes.body.data;

    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validGoal);

    expect(res.statusCode).toBe(400);
  });

  it('creates a goal for the logged-in family head, defaulting currentAmount to 0', async () => {
    const { accessToken, userId } = await registerUserWithFamily('goalhead1@example.com');

    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validGoal);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.name).toBe(validGoal.name);
    expect(res.body.data.currentAmount).toBe(0);
    expect(res.body.data.owner).toBe(userId);
    expect(res.body.data.progressPercent).toBe(0);
    expect(res.body.data.isAchieved).toBe(false);
  });

  it('rejects a target amount of 0 or less', async () => {
    const { accessToken } = await registerUserWithFamily('goalhead2@example.com');

    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validGoal, targetAmount: 0 });

    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid category', async () => {
    const { accessToken } = await registerUserWithFamily('goalhead3@example.com');

    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validGoal, category: 'not_a_real_category' });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/goals', () => {
  it('lists only the goals belonging to the caller\'s own family, soonest deadline first', async () => {
    const family1 = await registerUserWithFamily('goalfamilyone@example.com');
    const family2 = await registerUserWithFamily('goalfamilytwo@example.com');

    await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${family1.accessToken}`)
      .send({ ...validGoal, name: 'Later Goal', targetDate: '2030-01-01' });

    await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${family1.accessToken}`)
      .send({ ...validGoal, name: 'Sooner Goal', targetDate: '2026-06-01' });

    await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${family2.accessToken}`)
      .send(validGoal);

    const res = await request(app)
      .get('/api/goals')
      .set('Authorization', `Bearer ${family1.accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBe('Sooner Goal'); // earliest targetDate first
  });
});

describe('PUT /api/goals/:id — logging progress', () => {
  it('updates currentAmount and recomputes progressPercent/isAchieved', async () => {
    const { accessToken } = await registerUserWithFamily('goalprogress@example.com');

    const createRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validGoal); // targetAmount: 100000

    const res = await request(app)
      .put(`/api/goals/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentAmount: 60000 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.currentAmount).toBe(60000);
    expect(res.body.data.progressPercent).toBe(60);
    expect(res.body.data.amountRemaining).toBe(40000);
    expect(res.body.data.isAchieved).toBe(false);
  });

  it('caps progressPercent at 100 even if currentAmount overshoots the target', async () => {
    const { accessToken } = await registerUserWithFamily('goalovershoot@example.com');

    const createRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validGoal); // targetAmount: 100000

    const res = await request(app)
      .put(`/api/goals/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentAmount: 150000 });

    expect(res.body.data.progressPercent).toBe(100);
    expect(res.body.data.amountRemaining).toBe(0);
    expect(res.body.data.isAchieved).toBe(true);
  });
});

describe('DELETE /api/goals/:id', () => {
  it('actually removes the goal (real delete, not soft-delete)', async () => {
    const { accessToken } = await registerUserWithFamily('goaldeleter@example.com');

    const createRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validGoal);
    const goalId = createRes.body.data._id;

    const deleteRes = await request(app)
      .delete(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(deleteRes.statusCode).toBe(200);

    const getRes = await request(app)
      .get(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(getRes.statusCode).toBe(404);
  });
});

describe('Family isolation', () => {
  it('blocks reading a goal that belongs to a different family', async () => {
    const family1 = await registerUserWithFamily('goalviewer@example.com');
    const family2 = await registerUserWithFamily('goalowner@example.com');

    const createRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${family2.accessToken}`)
      .send(validGoal);

    const res = await request(app)
      .get(`/api/goals/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${family1.accessToken}`);

    expect(res.statusCode).toBe(403);
  });
});
