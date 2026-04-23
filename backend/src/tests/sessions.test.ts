/**
 * Sessions Route Tests — /api/sessions
 *
 * Functional coverage:
 *  · POST / — creates session, returns 201, persists all fields, completedAt auto-set
 *  · GET /user/:userId — returns sessions for user, empty array when none, limit 10,
 *    newest-first ordering
 *
 * Security & privacy coverage:
 *  · POST: missing required fields (userId, userName) → 500 (Mongoose validation gap — no 400)
 *  · Privacy gap: any caller can retrieve any user's session history without authentication
 *  · XSS/injection: userName stored as literal string (safe at storage layer)
 *  · No authorization on session creation — any client can forge sessions for any userId
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/User';
import GameSession from '../models/GameSession';
import { connect, disconnect, clearDatabase } from './db';

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
afterEach(async () => { await clearDatabase(); });

// ── Helpers ────────────────────────────────────────────────────────────────

async function createUser(name = 'TestUser') {
  return User.create({ name });
}

function sessionPayload(
  userId: string,
  overrides: Partial<{
    userName: string;
    questionsAsked: string[];
    correctAnswers: number;
    wrongAnswers: number;
    score: number;
  }> = {}
) {
  return {
    userId,
    userName: 'TestUser',
    questionsAsked: ['q1', 'q2', 'q3', 'q4', 'q5'],
    correctAnswers: 3,
    wrongAnswers: 2,
    score: 30,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// POST /api/sessions
// ══════════════════════════════════════════════════════════════════════════

describe('POST /api/sessions', () => {
  describe('Session creation', () => {
    test('returns 201 Created on success', async () => {
      const user = await createUser();
      const res = await request(app)
        .post('/api/sessions')
        .send(sessionPayload(user._id.toString()));
      expect(res.status).toBe(201);
    });

    test('response body contains the created session', async () => {
      const user = await createUser();
      const res = await request(app)
        .post('/api/sessions')
        .send(sessionPayload(user._id.toString()));
      expect(res.body._id).toBeDefined();
      expect(res.body.userName).toBe('TestUser');
      expect(res.body.correctAnswers).toBe(3);
      expect(res.body.wrongAnswers).toBe(2);
      expect(res.body.score).toBe(30);
    });

    test('persists the session to the database', async () => {
      const user = await createUser();
      await request(app)
        .post('/api/sessions')
        .send(sessionPayload(user._id.toString()));
      const count = await GameSession.countDocuments({ userId: user._id });
      expect(count).toBe(1);
    });

    test('persists questionsAsked array correctly', async () => {
      const user = await createUser();
      await request(app)
        .post('/api/sessions')
        .send(sessionPayload(user._id.toString(), { questionsAsked: ['q1', 'q2'] }));
      const session = await GameSession.findOne({ userId: user._id });
      expect(session?.questionsAsked).toEqual(['q1', 'q2']);
    });

    test('completedAt is set automatically', async () => {
      const user = await createUser();
      const before = Date.now();
      await request(app)
        .post('/api/sessions')
        .send(sessionPayload(user._id.toString()));
      const after = Date.now();
      const session = await GameSession.findOne({ userId: user._id });
      const completedTime = session?.completedAt.getTime() ?? 0;
      expect(completedTime).toBeGreaterThanOrEqual(before);
      expect(completedTime).toBeLessThanOrEqual(after);
    });

    test('correctAnswers and wrongAnswers default to 0 when omitted', async () => {
      const user = await createUser();
      await request(app)
        .post('/api/sessions')
        .send({ userId: user._id.toString(), userName: 'TestUser', questionsAsked: [] });
      const session = await GameSession.findOne({ userId: user._id });
      expect(session?.correctAnswers).toBe(0);
      expect(session?.wrongAnswers).toBe(0);
      expect(session?.score).toBe(0);
    });

    test('score defaults to 0 when omitted', async () => {
      const user = await createUser();
      await request(app)
        .post('/api/sessions')
        .send({ userId: user._id.toString(), userName: 'TestUser', questionsAsked: [] });
      const session = await GameSession.findOne({ userId: user._id });
      expect(session?.score).toBe(0);
    });
  });

  describe('Validation gaps (documented)', () => {
    test('missing userId → 500 (Mongoose required validation; no 400 returned)', async () => {
      // Gap: the route does not validate required fields before calling .save();
      // a missing userId causes a Mongoose ValidationError caught as a generic 500.
      const res = await request(app)
        .post('/api/sessions')
        .send({ userName: 'TestUser', questionsAsked: [], correctAnswers: 0, wrongAnswers: 0, score: 0 });
      expect(res.status).toBe(500);
    });

    test('missing userName → 500 (Mongoose required validation; no 400 returned)', async () => {
      const user = await createUser();
      const res = await request(app)
        .post('/api/sessions')
        .send({ userId: user._id.toString(), questionsAsked: [], correctAnswers: 0, wrongAnswers: 0, score: 0 });
      expect(res.status).toBe(500);
    });
  });

  describe('Security', () => {
    test('HTML in userName stored as literal string (XSS safe at the storage layer)', async () => {
      const user = await createUser();
      const xss = '<script>alert("xss")</script>';
      await request(app)
        .post('/api/sessions')
        .send(sessionPayload(user._id.toString(), { userName: xss }));
      const session = await GameSession.findOne({ userId: user._id });
      expect(session?.userName).toBe(xss); // stored verbatim, not executed
    });

    test('no authorization: any caller can create a session for any userId', async () => {
      // Documents a known gap: no authentication is required to save a session.
      // A malicious client could forge game history for another user's account.
      const user = await createUser('VictimUser');
      const res = await request(app)
        .post('/api/sessions')
        .send(sessionPayload(user._id.toString(), { userName: 'VictimUser', score: 9999 }));
      expect(res.status).toBe(201);
    });

    test('non-existent userId is stored without FK validation (no 404)', async () => {
      // Gap: GameSession.userId is an ObjectId ref to User, but the route does
      // not verify the referenced User exists before saving the session.
      const fakeUserId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/sessions')
        .send(sessionPayload(fakeUserId));
      expect(res.status).toBe(201);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// GET /api/sessions/user/:userId
// ══════════════════════════════════════════════════════════════════════════

describe('GET /api/sessions/user/:userId', () => {
  describe('Retrieval', () => {
    test('returns 200 with sessions for a user', async () => {
      const user = await createUser();
      await GameSession.create({
        userId: user._id, userName: user.name, questionsAsked: [],
        correctAnswers: 2, wrongAnswers: 3, score: 20,
      });
      const res = await request(app).get(`/api/sessions/user/${user._id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    test('returns empty array for a user with no sessions', async () => {
      const user = await createUser();
      const res = await request(app).get(`/api/sessions/user/${user._id}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('returns empty array for an unknown userId', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/sessions/user/${fakeId}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('each session contains correctAnswers, wrongAnswers, score, completedAt', async () => {
      const user = await createUser();
      await GameSession.create({
        userId: user._id, userName: user.name, questionsAsked: ['q1'],
        correctAnswers: 4, wrongAnswers: 1, score: 40,
      });
      const res = await request(app).get(`/api/sessions/user/${user._id}`);
      const session = res.body[0];
      expect(session.correctAnswers).toBe(4);
      expect(session.wrongAnswers).toBe(1);
      expect(session.score).toBe(40);
      expect(session.completedAt).toBeDefined();
    });
  });

  describe('Ordering and limit', () => {
    test('returns sessions sorted by completedAt descending (newest first)', async () => {
      const user = await createUser();
      const base = Date.now();
      await GameSession.create({
        userId: user._id, userName: user.name, questionsAsked: [],
        score: 10, completedAt: new Date(base - 2000),
      });
      await GameSession.create({
        userId: user._id, userName: user.name, questionsAsked: [],
        score: 30, completedAt: new Date(base - 1000),
      });
      await GameSession.create({
        userId: user._id, userName: user.name, questionsAsked: [],
        score: 50, completedAt: new Date(base),
      });
      const res = await request(app).get(`/api/sessions/user/${user._id}`);
      expect(res.body[0].score).toBe(50);
      expect(res.body[1].score).toBe(30);
      expect(res.body[2].score).toBe(10);
    });

    test('returns at most 10 sessions even when more exist', async () => {
      const user = await createUser();
      const sessions = Array.from({ length: 15 }, (_, i) => ({
        userId: user._id,
        userName: user.name,
        questionsAsked: [],
        score: i * 10,
        completedAt: new Date(Date.now() - i * 1000),
      }));
      await GameSession.insertMany(sessions);
      const res = await request(app).get(`/api/sessions/user/${user._id}`);
      expect(res.body).toHaveLength(10);
    });

    test('the 10-session limit returns the most recent sessions', async () => {
      const user = await createUser();
      const sessions = Array.from({ length: 12 }, (_, i) => ({
        userId: user._id,
        userName: user.name,
        questionsAsked: [],
        score: i + 1,
        completedAt: new Date(Date.now() - (11 - i) * 1000),
      }));
      await GameSession.insertMany(sessions);
      const res = await request(app).get(`/api/sessions/user/${user._id}`);
      // Scores 12 through 3 (newest 10) — the two oldest (score 1, 2) should not appear
      const scores: number[] = res.body.map((s: { score: number }) => s.score);
      expect(scores).not.toContain(1);
      expect(scores).not.toContain(2);
    });
  });

  describe('Privacy (documented gap)', () => {
    test('no authorization: any caller can read any user session history by userId', async () => {
      // Documents a known gap: no authentication is required to retrieve session history.
      // A client that knows another user's _id can access their full play history.
      const user = await createUser('VictimUser');
      await GameSession.create({
        userId: user._id, userName: user.name,
        questionsAsked: [], score: 500,
      });
      const res = await request(app).get(`/api/sessions/user/${user._id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1); // full history exposed without any auth
    });
  });
});
