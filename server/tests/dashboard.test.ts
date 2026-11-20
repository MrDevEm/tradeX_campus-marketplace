import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.ts';
import { ENV } from '../config/env.ts';
import { prisma } from '../db/prisma.ts';

describe('Feature: Student Dashboard API (/api/dashboard)', () => {
  const app = createApp();
  let studentToken: string;
  let studentUserId: string;

  before(async () => {
    // Find pre-seeded student account (Dawit M.)
    const student = await prisma.user.findUnique({
      where: { email: 'student@mu.edu.et' },
    });

    if (student) {
      studentUserId = student.id;
      studentToken = jwt.sign(
        {
          userId: student.id,
          email: student.email,
          role: student.role,
          status: student.status,
          fullName: student.fullName,
        },
        ENV.JWT_SECRET,
        { expiresIn: '1h' }
      );
    }
  });

  describe('GET /api/dashboard/summary', () => {
    it('returns 401 UNAUTHORIZED when no token is provided', async () => {
      const res = await request(app).get('/api/dashboard/summary');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    it('returns 200 with student dashboard metrics in standard envelope', async () => {
      if (!studentToken) return;

      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${studentToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.error, null);
      assert(typeof res.body.data.activeListingsCount === 'number');
      assert(typeof res.body.data.savedItemsCount === 'number');
      assert(typeof res.body.data.unreadChatsCount === 'number');
      assert(typeof res.body.data.trustScore === 'string');
    });
  });

  describe('GET /api/dashboard/listings', () => {
    it('returns 401 UNAUTHORIZED when no token is provided', async () => {
      const res = await request(app).get('/api/dashboard/listings');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    it('returns 200 with student own listings formatted for client UI', async () => {
      if (!studentToken) return;

      const res = await request(app)
        .get('/api/dashboard/listings')
        .set('Authorization', `Bearer ${studentToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.error, null);
      assert(Array.isArray(res.body.data));
    });
  });
});
