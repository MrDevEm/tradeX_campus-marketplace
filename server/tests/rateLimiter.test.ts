import { describe, it } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import request from 'supertest';
import { createRateLimiter } from '../middleware/rateLimiter.ts';

describe('Security: Rate Limiter Middleware', () => {
  it('allows requests within the configured limit and sets rate limit headers', async () => {
    const app = express();
    const testLimiter = createRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 3,
      skipInTests: false, // Explicitly test limiter behavior
    });

    app.get('/test', testLimiter, (req, res) => {
      res.json({ success: true });
    });

    // 1st request
    const res1 = await request(app).get('/test');
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.headers['x-ratelimit-limit'], '3');
    assert.strictEqual(res1.headers['x-ratelimit-remaining'], '2');

    // 2nd request
    const res2 = await request(app).get('/test');
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.headers['x-ratelimit-remaining'], '1');

    // 3rd request
    const res3 = await request(app).get('/test');
    assert.strictEqual(res3.status, 200);
    assert.strictEqual(res3.headers['x-ratelimit-remaining'], '0');
  });

  it('blocks requests exceeding limit with 429 TOO_MANY_REQUESTS in standard envelope', async () => {
    const app = express();
    const testLimiter = createRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 2,
      skipInTests: false,
    });

    app.get('/test', testLimiter, (req, res) => {
      res.json({ success: true });
    });

    await request(app).get('/test');
    await request(app).get('/test');

    // 3rd request should exceed limit
    const blockedRes = await request(app).get('/test');
    assert.strictEqual(blockedRes.status, 429);
    assert.strictEqual(blockedRes.body.error.code, 'TOO_MANY_REQUESTS');
    assert(blockedRes.headers['retry-after']);
    assert(blockedRes.body.error.message.includes('Too many requests'));
  });
});
