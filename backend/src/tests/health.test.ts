/**
 * Health, CORS, and Cross-Cutting Security Tests
 *
 * Coverage:
 *  · GET /api/health — status and dbState fields
 *  · CORS whitelist: allowed origins receive Access-Control-Allow-Origin header
 *  · CORS whitelist: unlisted origins are denied the ACAO header
 *  · Both whitelisted origins are accepted (localhost:5173 and 127.0.0.1:5173)
 *  · express.json() enforces 100 KB body size limit across all routes (413)
 *  · No stack traces or internal details in error response bodies
 *  · Undefined routes return 404 (Express default; no sensitive data in response)
 */

import request from 'supertest';
import app from '../app';
import { connect, disconnect } from './db';

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });

// ══════════════════════════════════════════════════════════════════════════
// GET /api/health
// ══════════════════════════════════════════════════════════════════════════

describe('GET /api/health', () => {
  test('returns 200 with status "ok"', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('includes dbState as a number (0–3 are the valid Mongoose readyState values)', async () => {
    const res = await request(app).get('/api/health');
    expect(typeof res.body.dbState).toBe('number');
    expect(res.body.dbState).toBeGreaterThanOrEqual(0);
    expect(res.body.dbState).toBeLessThanOrEqual(3);
  });

  test('dbState is 1 (connected) while test database is running', async () => {
    const res = await request(app).get('/api/health');
    // MongoMemoryServer is connected via beforeAll — readyState 1 = connected
    expect(res.body.dbState).toBe(1);
  });

  test('response Content-Type is application/json', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// CORS
// ══════════════════════════════════════════════════════════════════════════

describe('CORS', () => {
  test('allowed origin http://localhost:5173 receives Access-Control-Allow-Origin header', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  test('allowed origin http://127.0.0.1:5173 receives Access-Control-Allow-Origin header', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://127.0.0.1:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1:5173');
  });

  test('disallowed origin does not receive Access-Control-Allow-Origin header', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('production domain is not in the CORS whitelist', async () => {
    // If a production domain were accidentally whitelisted, any deployed client could
    // make credentialed cross-origin requests. Verify the whitelist stays minimal.
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://quizzicle.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('wildcard * is not used as the CORS origin', async () => {
    // A wildcard would allow any site to read API responses — verify it is never set.
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Body size limit (express.json default: 100 KB)
// ══════════════════════════════════════════════════════════════════════════

describe('Body size limit', () => {
  test('POST /api/users/login rejects body > 100 KB with 413', async () => {
    const bigName = 'A'.repeat(200_000); // ~200 KB JSON body
    const res = await request(app)
      .post('/api/users/login')
      .send({ name: bigName });
    expect(res.status).toBe(413);
  });

  test('POST /api/sessions rejects body > 100 KB with 413', async () => {
    const hugeArray = Array.from({ length: 10_000 }, (_, i) => `question-id-${i}`);
    const res = await request(app)
      .post('/api/sessions')
      .send({
        userId: '507f1f77bcf86cd799439011',
        userName: 'TestUser',
        questionsAsked: hugeArray,
        correctAnswers: 0,
        wrongAnswers: 0,
        score: 0,
      });
    expect(res.status).toBe(413);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Error response safety
// ══════════════════════════════════════════════════════════════════════════

describe('Error response safety', () => {
  test('malformed JSON body returns 400 without leaking a stack trace', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .set('Content-Type', 'application/json')
      .send('{ bad json }');
    expect(res.status).toBe(400);
    // The response body must not contain a Node.js stack trace
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/at\s+\w+\s+\(/); // stack frame pattern
    expect(body).not.toContain('node_modules');
  });

  test('server error responses return { error: "Server error" } without internal details', async () => {
    // Trigger a 500 by sending a missing required field to the sessions endpoint
    const res = await request(app)
      .post('/api/sessions')
      .send({ userName: 'NoUserId' });
    expect(res.status).toBe(500);
    // Must not expose Mongoose error internals, stack traces, or DB details
    expect(res.body.error).toBe('Server error');
    expect(JSON.stringify(res.body)).not.toContain('mongodb');
    expect(JSON.stringify(res.body)).not.toContain('ValidationError');
  });

  test('undefined route returns 404 (Express default, no sensitive data)', async () => {
    const res = await request(app).get('/api/nonexistent-route');
    expect(res.status).toBe(404);
  });
});
