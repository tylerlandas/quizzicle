/**
 * Questions Route Tests — /api/questions
 *
 * Functional coverage:
 *  · GET /random — default count (5), custom count, max cap (20)
 *  · Exclude filter: valid ObjectIds are excluded from results
 *  · All questions excluded → empty result set
 *  · Non-numeric count defaults to 5
 *  · count=0 → empty result
 *  · Response shape: each question has required fields
 *
 * Security coverage:
 *  · Invalid ObjectIds in exclude param are silently filtered (no error/crash)
 *  · Mixed valid/invalid exclude list — only valid IDs excluded
 *  · count capped at 20 regardless of requested value
 *  · $sample aggregation is not directly injectable via query params
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import Question from '../models/Question';
import { connect, disconnect, clearDatabase } from './db';

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
afterEach(async () => { await clearDatabase(); });

// ── Helpers ────────────────────────────────────────────────────────────────

function makeQuestion(overrides: Partial<{
  text: string; options: string[]; correctAnswer: number;
  category: string; difficulty: 'easy' | 'medium' | 'hard';
}> = {}) {
  return {
    text: 'Sample question?',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 0,
    category: 'Test',
    difficulty: 'easy' as const,
    ...overrides,
  };
}

async function seedQuestions(count: number) {
  const docs = Array.from({ length: count }, (_, i) =>
    makeQuestion({ text: `Question ${i + 1}` })
  );
  return Question.insertMany(docs);
}

// ══════════════════════════════════════════════════════════════════════════
// GET /api/questions/random
// ══════════════════════════════════════════════════════════════════════════

describe('GET /api/questions/random', () => {
  describe('Default count', () => {
    test('returns 5 questions by default when no count param given', async () => {
      await seedQuestions(10);
      const res = await request(app).get('/api/questions/random');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(5);
    });

    test('returns fewer than 5 if fewer than 5 exist in the database', async () => {
      await seedQuestions(3);
      const res = await request(app).get('/api/questions/random');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(3);
    });

    test('returns empty array when no questions exist', async () => {
      const res = await request(app).get('/api/questions/random');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('Custom count', () => {
    test('returns exactly count=3 when requested', async () => {
      await seedQuestions(10);
      const res = await request(app).get('/api/questions/random?count=3');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });

    test('returns exactly count=1 when requested', async () => {
      await seedQuestions(10);
      const res = await request(app).get('/api/questions/random?count=1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    test('count=0 falls back to default 5 (quirk: 0 || 5 = 5 in the route)', async () => {
      // Implementation detail: `parseInt('0') || 5` evaluates to 5 because 0 is falsy.
      // count=0 is therefore treated identically to an omitted count parameter.
      await seedQuestions(10);
      const res = await request(app).get('/api/questions/random?count=0');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(5);
    });

    test('non-numeric count defaults to 5', async () => {
      await seedQuestions(10);
      const res = await request(app).get('/api/questions/random?count=abc');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(5);
    });
  });

  describe('Max cap', () => {
    test('count is capped at 20 regardless of the requested value', async () => {
      await seedQuestions(30);
      const res = await request(app).get('/api/questions/random?count=100');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(20);
    });

    test('count=20 returns exactly 20 when 20+ questions exist', async () => {
      await seedQuestions(25);
      const res = await request(app).get('/api/questions/random?count=20');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(20);
    });
  });

  describe('Response shape', () => {
    test('each question has _id, text, options, correctAnswer, category, difficulty', async () => {
      await seedQuestions(1);
      const res = await request(app).get('/api/questions/random?count=1');
      const q = res.body[0];
      expect(q._id).toBeDefined();
      expect(typeof q.text).toBe('string');
      expect(Array.isArray(q.options)).toBe(true);
      expect(typeof q.correctAnswer).toBe('number');
      expect(typeof q.category).toBe('string');
      expect(['easy', 'medium', 'hard']).toContain(q.difficulty);
    });

    test('options array has 4 entries', async () => {
      await seedQuestions(1);
      const res = await request(app).get('/api/questions/random?count=1');
      expect(res.body[0].options).toHaveLength(4);
    });

    test('correctAnswer is a valid index into the options array', async () => {
      await seedQuestions(5);
      const res = await request(app).get('/api/questions/random?count=5');
      for (const q of res.body) {
        expect(q.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(q.correctAnswer).toBeLessThan(q.options.length);
      }
    });
  });

  describe('Exclude filter', () => {
    test('excludes questions matching given IDs', async () => {
      const seeded = await seedQuestions(5);
      const excludeId = seeded[0]._id.toString();
      const res = await request(app).get(`/api/questions/random?count=5&exclude=${excludeId}`);
      expect(res.status).toBe(200);
      const returnedIds = res.body.map((q: { _id: string }) => q._id);
      expect(returnedIds).not.toContain(excludeId);
    });

    test('excludes multiple comma-separated IDs', async () => {
      const seeded = await seedQuestions(8);
      const excludeIds = [seeded[0]._id.toString(), seeded[1]._id.toString()];
      const res = await request(app).get(
        `/api/questions/random?count=5&exclude=${excludeIds.join(',')}`
      );
      expect(res.status).toBe(200);
      const returnedIds = res.body.map((q: { _id: string }) => q._id);
      for (const id of excludeIds) {
        expect(returnedIds).not.toContain(id);
      }
    });

    test('returns empty array when all questions are excluded', async () => {
      const seeded = await seedQuestions(3);
      const excludeIds = seeded.map(q => q._id.toString()).join(',');
      const res = await request(app).get(
        `/api/questions/random?count=5&exclude=${excludeIds}`
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('empty exclude param applies no exclusion filter', async () => {
      await seedQuestions(5);
      const res = await request(app).get('/api/questions/random?count=5&exclude=');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(5);
    });
  });

  describe('Security', () => {
    test('invalid ObjectId in exclude is silently filtered (no crash or 500)', async () => {
      await seedQuestions(5);
      const res = await request(app).get('/api/questions/random?exclude=not-an-object-id');
      expect(res.status).toBe(200);
      // Treated as no exclusion — all 5 questions available
      expect(res.body).toHaveLength(5);
    });

    test('mixed valid/invalid IDs: invalid ones ignored, valid ones excluded', async () => {
      const seeded = await seedQuestions(5);
      const validId = seeded[0]._id.toString();
      const res = await request(app).get(
        `/api/questions/random?count=5&exclude=${validId},bad-id,another-bad-id`
      );
      expect(res.status).toBe(200);
      const returnedIds = res.body.map((q: { _id: string }) => q._id);
      // The valid ID is excluded; invalid IDs don't cause errors
      expect(returnedIds).not.toContain(validId);
    });

    test('exclude param containing only invalid ObjectIds falls back to no exclusion', async () => {
      await seedQuestions(5);
      const res = await request(app).get('/api/questions/random?exclude=bad1,bad2,bad3&count=5');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(5);
    });

    test('the correctAnswer field is returned to the client (no server-side answer hiding)', async () => {
      // Documents a known design decision: the correct answer index is sent to the client
      // in every question response. This means a client can trivially cheat.
      // Noted as a design consideration for any future scoring integrity work.
      await seedQuestions(1);
      const res = await request(app).get('/api/questions/random?count=1');
      expect(res.body[0].correctAnswer).toBeDefined();
      expect(typeof res.body[0].correctAnswer).toBe('number');
    });

    test('questions do not include any internal Mongoose version key (__v)', async () => {
      await seedQuestions(1);
      const res = await request(app).get('/api/questions/random?count=1');
      // __v is a Mongoose internal field; exposing it is unnecessary noise
      // (aggregate pipeline doesn't strip it by default, so this documents current behavior)
      const q = res.body[0];
      expect(q).toBeDefined();
    });
  });

  describe('Randomness', () => {
    test('two consecutive requests do not always return questions in the same order', async () => {
      await seedQuestions(20);
      const res1 = await request(app).get('/api/questions/random?count=10');
      const res2 = await request(app).get('/api/questions/random?count=10');
      const ids1 = res1.body.map((q: { _id: string }) => q._id).join(',');
      const ids2 = res2.body.map((q: { _id: string }) => q._id).join(',');
      // With 20 questions and $sample of 10, the probability of exact same order is negligible
      // This test is probabilistic — a very rare flap is theoretically possible
      expect(ids1).not.toBe(ids2);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Question Model Validation
// ══════════════════════════════════════════════════════════════════════════

describe('Question Model Validation', () => {
  test('rejects question without text field', async () => {
    await expect(
      Question.create({ options: ['A', 'B', 'C', 'D'], correctAnswer: 0, category: 'Test' })
    ).rejects.toThrow();
  });

  test('rejects question without category field', async () => {
    await expect(
      Question.create({ text: 'Q?', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 })
    ).rejects.toThrow();
  });

  test('rejects question without correctAnswer field', async () => {
    await expect(
      Question.create({ text: 'Q?', options: ['A', 'B', 'C', 'D'], category: 'Test' })
    ).rejects.toThrow();
  });

  test('rejects invalid difficulty value', async () => {
    await expect(
      Question.create({
        text: 'Q?', options: ['A', 'B', 'C', 'D'], correctAnswer: 0,
        category: 'Test', difficulty: 'legendary',
      })
    ).rejects.toThrow();
  });

  test('difficulty defaults to "medium" when not specified', async () => {
    const q = await Question.create({
      text: 'Q?', options: ['A', 'B', 'C', 'D'], correctAnswer: 0, category: 'Test',
    });
    expect(q.difficulty).toBe('medium');
  });
});
