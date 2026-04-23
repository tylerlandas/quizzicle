/**
 * Users Route Tests — /api/users
 *
 * Functional coverage:
 *  · POST /login — create new user, find existing, trim whitespace, defaults
 *  · GET  /leaderboard — sort order, field projection, empty state
 *  · PATCH /:id/score — increment score & gamesPlayed, $addToSet deduplication, 404
 *  · PATCH /:id/preferences — update soundEnabled flag, 404
 *
 * Security & privacy coverage:
 *  · Input validation rejects empty / whitespace-only / null names
 *  · Malformed JSON body → 400 (Express.json() parse protection)
 *  · NoSQL injection via object name → blocked (no user data leaked)
 *  · HTML stored as literal string (XSS not executed at the storage layer)
 *  · Login response is scoped to the requesting user only
 *  · Leaderboard omits sensitive fields (questionsAnswered, soundEnabled, timestamps)
 *  · IDOR: no server-side authorization on score/preferences endpoints (documented gap)
 *  · Negative score is accepted without range validation (documented gap)
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/User';
import { connect, disconnect, clearDatabase } from './db';

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
afterEach(async () => { await clearDatabase(); });

// ══════════════════════════════════════════════════════════════════════════
// POST /api/users/login
// ══════════════════════════════════════════════════════════════════════════

describe('POST /api/users/login', () => {
  describe('User creation', () => {
    test('creates a new user and returns isNew: true', async () => {
      const res = await request(app).post('/api/users/login').send({ name: 'Alice' });
      expect(res.status).toBe(200);
      expect(res.body.isNew).toBe(true);
      expect(res.body.user.name).toBe('Alice');
    });

    test('returns _id, name, totalScore, gamesPlayed, questionsAnswered, soundEnabled', async () => {
      const res = await request(app).post('/api/users/login').send({ name: 'Alice' });
      const { user } = res.body;
      expect(user._id).toBeDefined();
      expect(user.name).toBe('Alice');
      expect(user.totalScore).toBe(0);
      expect(user.gamesPlayed).toBe(0);
      expect(user.questionsAnswered).toEqual([]);
      expect(user.soundEnabled).toBe(true);
    });

    test('new user defaults: totalScore 0, gamesPlayed 0, questionsAnswered []', async () => {
      const res = await request(app).post('/api/users/login').send({ name: 'Bob' });
      expect(res.body.user.totalScore).toBe(0);
      expect(res.body.user.gamesPlayed).toBe(0);
      expect(res.body.user.questionsAnswered).toEqual([]);
    });

    test('new user soundEnabled defaults to true', async () => {
      const res = await request(app).post('/api/users/login').send({ name: 'Carol' });
      expect(res.body.user.soundEnabled).toBe(true);
    });

    test('persists user to the database', async () => {
      await request(app).post('/api/users/login').send({ name: 'Dave' });
      const dbUser = await User.findOne({ name: 'Dave' });
      expect(dbUser).not.toBeNull();
    });
  });

  describe('Returning user', () => {
    test('finds existing user and returns isNew: false', async () => {
      await User.create({ name: 'Eve', totalScore: 50, gamesPlayed: 3 });
      const res = await request(app).post('/api/users/login').send({ name: 'Eve' });
      expect(res.status).toBe(200);
      expect(res.body.isNew).toBe(false);
    });

    test('returning user retains existing score and games played', async () => {
      await User.create({ name: 'Eve', totalScore: 50, gamesPlayed: 3 });
      const res = await request(app).post('/api/users/login').send({ name: 'Eve' });
      expect(res.body.user.totalScore).toBe(50);
      expect(res.body.user.gamesPlayed).toBe(3);
    });

    test('does not create a second document for an existing name', async () => {
      await User.create({ name: 'Eve' });
      await request(app).post('/api/users/login').send({ name: 'Eve' });
      const count = await User.countDocuments({ name: 'Eve' });
      expect(count).toBe(1);
    });
  });

  describe('Name trimming', () => {
    test('trims leading and trailing whitespace before lookup', async () => {
      await User.create({ name: 'Frank' });
      const res = await request(app).post('/api/users/login').send({ name: '  Frank  ' });
      expect(res.status).toBe(200);
      expect(res.body.isNew).toBe(false);
      expect(res.body.user.name).toBe('Frank');
    });

    test('stores trimmed name (no leading/trailing spaces in DB)', async () => {
      await request(app).post('/api/users/login').send({ name: '  Grace  ' });
      const dbUser = await User.findOne({ name: 'Grace' });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.name).toBe('Grace');
    });
  });

  describe('Input validation', () => {
    test('rejects empty string name with 400', async () => {
      const res = await request(app).post('/api/users/login').send({ name: '' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name is required');
    });

    test('rejects whitespace-only name with 400', async () => {
      const res = await request(app).post('/api/users/login').send({ name: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name is required');
    });

    test('rejects missing name field with 400', async () => {
      const res = await request(app).post('/api/users/login').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name is required');
    });

    test('rejects null name with 400', async () => {
      const res = await request(app).post('/api/users/login').send({ name: null });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name is required');
    });
  });

  describe('Security', () => {
    test('malformed JSON body returns 400 (Express.json() parse protection)', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .set('Content-Type', 'application/json')
        .send('{ bad json }');
      expect(res.status).toBe(400);
    });

    test('NoSQL injection via object name does not expose user data', async () => {
      await User.create({ name: 'VictimUser', totalScore: 9999 });
      // Sending { "$gt": "" } as name — should be blocked before reaching the DB query
      const res = await request(app)
        .post('/api/users/login')
        .send({ name: { $gt: '' } });
      // Must NOT return 200 with any user's data
      expect(res.status).not.toBe(200);
      if (res.body.user) {
        // If somehow a 200 is returned, the name must not be a real user's name
        expect(res.body.user.name).not.toBe('VictimUser');
      }
    });

    test('HTML in name is stored as a literal string (no server-side XSS execution)', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      const res = await request(app).post('/api/users/login').send({ name: xssPayload });
      expect(res.status).toBe(200);
      // Stored verbatim — rendering layers must handle escaping
      expect(res.body.user.name).toBe(xssPayload);
    });

    test('login response contains only the requesting user, not all users', async () => {
      await User.create({ name: 'OtherUser', totalScore: 9999 });
      const res = await request(app).post('/api/users/login').send({ name: 'Requester' });
      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Requester');
      expect(res.body.user.totalScore).toBe(0);
    });

    test('large payload (>100 KB) is rejected by express.json() with 413', async () => {
      const bigName = 'A'.repeat(200_000); // ~200 KB JSON body
      const res = await request(app).post('/api/users/login').send({ name: bigName });
      expect(res.status).toBe(413);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// GET /api/users/leaderboard
// ══════════════════════════════════════════════════════════════════════════

describe('GET /api/users/leaderboard', () => {
  test('returns 200 with empty array when no users exist', async () => {
    const res = await request(app).get('/api/users/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all users sorted by totalScore descending', async () => {
    await User.create([
      { name: 'Low', totalScore: 10 },
      { name: 'High', totalScore: 500 },
      { name: 'Mid', totalScore: 250 },
    ]);
    const res = await request(app).get('/api/users/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('High');
    expect(res.body[1].name).toBe('Mid');
    expect(res.body[2].name).toBe('Low');
  });

  test('each entry contains name, totalScore, gamesPlayed', async () => {
    await User.create({ name: 'Alice', totalScore: 100, gamesPlayed: 5 });
    const res = await request(app).get('/api/users/leaderboard');
    const entry = res.body[0];
    expect(entry.name).toBeDefined();
    expect(entry.totalScore).toBeDefined();
    expect(entry.gamesPlayed).toBeDefined();
  });

  describe('Privacy: sensitive fields excluded from leaderboard', () => {
    test('does not expose questionsAnswered', async () => {
      await User.create({ name: 'Alice', questionsAnswered: ['q1', 'q2'] });
      const res = await request(app).get('/api/users/leaderboard');
      expect(res.body[0].questionsAnswered).toBeUndefined();
    });

    test('does not expose soundEnabled', async () => {
      await User.create({ name: 'Alice', soundEnabled: false });
      const res = await request(app).get('/api/users/leaderboard');
      expect(res.body[0].soundEnabled).toBeUndefined();
    });

    test('does not expose createdAt or updatedAt timestamps', async () => {
      await User.create({ name: 'Alice' });
      const res = await request(app).get('/api/users/leaderboard');
      expect(res.body[0].createdAt).toBeUndefined();
      expect(res.body[0].updatedAt).toBeUndefined();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// PATCH /api/users/:id/score
// ══════════════════════════════════════════════════════════════════════════

describe('PATCH /api/users/:id/score', () => {
  test('increments totalScore by the provided amount', async () => {
    const user = await User.create({ name: 'Alice', totalScore: 0 });
    await request(app)
      .patch(`/api/users/${user._id}/score`)
      .send({ score: 50, questionsAnswered: [] });
    const updated = await User.findById(user._id);
    expect(updated?.totalScore).toBe(50);
  });

  test('increments totalScore cumulatively on repeated calls', async () => {
    const user = await User.create({ name: 'Alice', totalScore: 20 });
    await request(app)
      .patch(`/api/users/${user._id}/score`)
      .send({ score: 30, questionsAnswered: [] });
    const updated = await User.findById(user._id);
    expect(updated?.totalScore).toBe(50);
  });

  test('increments gamesPlayed by 1 per call', async () => {
    const user = await User.create({ name: 'Alice', gamesPlayed: 2 });
    await request(app)
      .patch(`/api/users/${user._id}/score`)
      .send({ score: 0, questionsAnswered: [] });
    const updated = await User.findById(user._id);
    expect(updated?.gamesPlayed).toBe(3);
  });

  test('adds new question IDs to questionsAnswered', async () => {
    const user = await User.create({ name: 'Alice', questionsAnswered: [] });
    await request(app)
      .patch(`/api/users/${user._id}/score`)
      .send({ score: 10, questionsAnswered: ['q1', 'q2'] });
    const updated = await User.findById(user._id);
    expect(updated?.questionsAnswered).toContain('q1');
    expect(updated?.questionsAnswered).toContain('q2');
  });

  test('does not duplicate questionsAnswered IDs ($addToSet)', async () => {
    const user = await User.create({ name: 'Alice', questionsAnswered: ['q1'] });
    await request(app)
      .patch(`/api/users/${user._id}/score`)
      .send({ score: 0, questionsAnswered: ['q1', 'q2'] });
    const updated = await User.findById(user._id);
    const q1Occurrences = updated?.questionsAnswered.filter(id => id === 'q1').length;
    expect(q1Occurrences).toBe(1);
  });

  test('returns the updated user document', async () => {
    const user = await User.create({ name: 'Alice', totalScore: 0 });
    const res = await request(app)
      .patch(`/api/users/${user._id}/score`)
      .send({ score: 40, questionsAnswered: [] });
    expect(res.status).toBe(200);
    expect(res.body.totalScore).toBe(40);
  });

  test('returns 404 for a non-existent user ID', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .patch(`/api/users/${fakeId}/score`)
      .send({ score: 10, questionsAnswered: [] });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  describe('Security', () => {
    test('IDOR: no authorization check — any caller can modify any user score', async () => {
      // Documents a known gap: no authentication is required to update a user's score.
      // Any client that knows a user's _id can alter their score.
      const user = await User.create({ name: 'Victim', totalScore: 0 });
      const res = await request(app)
        .patch(`/api/users/${user._id}/score`)
        .send({ score: 1000, questionsAnswered: [] });
      expect(res.status).toBe(200);
      const updated = await User.findById(user._id);
      expect(updated?.totalScore).toBe(1000);
    });

    test('negative score decrements totalScore (no server-side range validation)', async () => {
      // Documents a known gap: score values are not validated to be non-negative.
      // A malicious client could send a negative score to reduce another user's ranking.
      const user = await User.create({ name: 'Alice', totalScore: 50 });
      await request(app)
        .patch(`/api/users/${user._id}/score`)
        .send({ score: -100, questionsAnswered: [] });
      const updated = await User.findById(user._id);
      expect(updated?.totalScore).toBe(-50);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// PATCH /api/users/:id/preferences
// ══════════════════════════════════════════════════════════════════════════

describe('PATCH /api/users/:id/preferences', () => {
  test('sets soundEnabled to false', async () => {
    const user = await User.create({ name: 'Alice', soundEnabled: true });
    const res = await request(app)
      .patch(`/api/users/${user._id}/preferences`)
      .send({ soundEnabled: false });
    expect(res.status).toBe(200);
    expect(res.body.soundEnabled).toBe(false);
  });

  test('sets soundEnabled to true', async () => {
    const user = await User.create({ name: 'Alice', soundEnabled: false });
    const res = await request(app)
      .patch(`/api/users/${user._id}/preferences`)
      .send({ soundEnabled: true });
    expect(res.status).toBe(200);
    expect(res.body.soundEnabled).toBe(true);
  });

  test('persists the preference change to the database', async () => {
    const user = await User.create({ name: 'Alice', soundEnabled: true });
    await request(app)
      .patch(`/api/users/${user._id}/preferences`)
      .send({ soundEnabled: false });
    const updated = await User.findById(user._id);
    expect(updated?.soundEnabled).toBe(false);
  });

  test('returns 404 for a non-existent user ID', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .patch(`/api/users/${fakeId}/preferences`)
      .send({ soundEnabled: true });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  test('IDOR: no authorization check — any caller can update any user preferences', async () => {
    // Documents a known gap: no authentication required.
    const user = await User.create({ name: 'Victim', soundEnabled: true });
    const res = await request(app)
      .patch(`/api/users/${user._id}/preferences`)
      .send({ soundEnabled: false });
    expect(res.status).toBe(200);
  });
});
