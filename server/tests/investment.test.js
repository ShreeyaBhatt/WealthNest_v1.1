/**
 * tests/investment.test.js — Investment CRUD tests
 *
 * WHY test this file?
 * investment.controller.js has real business logic beyond plain CRUD —
 * a "join a family first" guard, soft-deletes instead of real deletes,
 * and a family-isolation rule (you can never see or touch another
 * family's investments). Those are exactly the kind of rules that are
 * easy to accidentally break while editing the file for something else,
 * and a test catches that immediately instead of during a demo.
 *
 * Every test here goes through the real HTTP routes (register → create
 * family → create investment), the same way the React client would,
 * instead of calling the Mongoose model directly. That way we're
 * testing the auth + validation + controller logic together, not just
 * the database layer.
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

/**
 * Small helper used by almost every test below: registers a brand-new
 * user and creates a family for them, then returns the access token
 * plus the user's own id. Not exported/shared across files on purpose
 * (see feedback_code_style memory — this project prefers writing
 * things out per-file over building shared test utilities).
 */
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

// A valid investment body we can reuse and tweak across tests.
const validInvestment = {
  name: 'HDFC Mutual Fund',
  category: 'mutual_fund',
  amount: 10000,
  currentValue: 11500,
  purchaseDate: '2024-01-01',
};

describe('POST /api/investments', () => {
  it('rejects creating an investment before joining/creating a family', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'No Family Yet', email: 'nofamily@example.com', password: 'password123' });
    const { accessToken } = registerRes.body.data;

    const res = await request(app)
      .post('/api/investments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validInvestment);

    expect(res.statusCode).toBe(400);
  });

  it('creates an investment for the logged-in family head', async () => {
    const { accessToken, userId } = await registerUserWithFamily('head1@example.com');

    const res = await request(app)
      .post('/api/investments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validInvestment);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.name).toBe(validInvestment.name);
    // No owner/ownerType was sent, so it should default to "the head themself".
    expect(res.body.data.ownerType).toBe('User');
    expect(res.body.data.owner).toBe(userId);
  });

  it('rejects an invalid category', async () => {
    const { accessToken } = await registerUserWithFamily('head2@example.com');

    const res = await request(app)
      .post('/api/investments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validInvestment, category: 'not_a_real_category' });

    expect(res.statusCode).toBe(400);
  });

  it('rejects a maturity date before the purchase date', async () => {
    const { accessToken } = await registerUserWithFamily('head3@example.com');

    const res = await request(app)
      .post('/api/investments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validInvestment, maturityDate: '2020-01-01' }); // before purchaseDate

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/investments', () => {
  it('lists only the investments belonging to the caller\'s own family', async () => {
    const family1 = await registerUserWithFamily('familyone@example.com');
    const family2 = await registerUserWithFamily('familytwo@example.com');

    await request(app)
      .post('/api/investments')
      .set('Authorization', `Bearer ${family1.accessToken}`)
      .send(validInvestment);

    await request(app)
      .post('/api/investments')
      .set('Authorization', `Bearer ${family2.accessToken}`)
      .send({ ...validInvestment, name: 'Family Two Gold' });

    const res = await request(app)
      .get('/api/investments')
      .set('Authorization', `Bearer ${family1.accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe(validInvestment.name);
  });
});

describe('GET /api/investments/:id', () => {
  it('blocks reading an investment that belongs to a different family', async () => {
    const family1 = await registerUserWithFamily('viewer@example.com');
    const family2 = await registerUserWithFamily('owner@example.com');

    const createRes = await request(app)
      .post('/api/investments')
      .set('Authorization', `Bearer ${family2.accessToken}`)
      .send(validInvestment);

    const res = await request(app)
      .get(`/api/investments/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${family1.accessToken}`);

    expect(res.statusCode).toBe(403);
  });
});

describe('PUT /api/investments/:id', () => {
  it('updates fields that were sent and leaves the rest untouched', async () => {
    const { accessToken } = await registerUserWithFamily('updater@example.com');

    const createRes = await request(app)
      .post('/api/investments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validInvestment);

    const res = await request(app)
      .put(`/api/investments/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentValue: 12000 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.currentValue).toBe(12000);
    expect(res.body.data.name).toBe(validInvestment.name); // unchanged
  });
});

describe('DELETE /api/investments/:id', () => {
  it('soft-deletes: the investment disappears from the list but still exists', async () => {
    const { accessToken } = await registerUserWithFamily('deleter@example.com');

    const createRes = await request(app)
      .post('/api/investments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validInvestment);
    const investmentId = createRes.body.data._id;

    const deleteRes = await request(app)
      .delete(`/api/investments/${investmentId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(deleteRes.statusCode).toBe(200);

    // Gone from the list (getInvestments filters isActive: true)...
    const listRes = await request(app)
      .get('/api/investments')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(listRes.body.data).toHaveLength(0);

    // ...but the document itself still exists, just marked inactive.
    const getRes = await request(app)
      .get(`/api/investments/${investmentId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.data.isActive).toBe(false);
  });
});
