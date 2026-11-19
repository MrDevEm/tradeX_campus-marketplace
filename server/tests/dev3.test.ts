import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../app.ts';

const app = createApp();

describe('Phase 3: Developer 3 Backend Endpoints Test Suite', () => {
  describe('Campus Safety & Meetup Spots', () => {
    it('GET /api/chat/meetup-spots returns 200 with list of verified safe exchange zones', async () => {
      const res = await request(app).get('/api/chat/meetup-spots');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.error, null);
      assert.ok(Array.isArray(res.body.data), 'Expected data to be an array');
      assert.ok(res.body.meta?.timestamp, 'Expected envelope timestamp');
    });
  });

  describe('Student ID Verification Endpoints', () => {
    it('POST /api/verification/upload-id returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/verification/upload-id')
        .send({ idDocument: 'data:image/png;base64,mock' });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.data, null);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    it('GET /api/verification/status returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/verification/status');

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.data, null);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });
  });

  describe('In-App Notification Endpoints', () => {
    it('GET /api/notifications returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/notifications');

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.data, null);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    it('POST /api/notifications/read-all returns 401 when unauthenticated', async () => {
      const res = await request(app).post('/api/notifications/read-all');

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.data, null);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });
  });

  describe('Real-Time Campus Chat Endpoints', () => {
    it('GET /api/chat/conversations returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/chat/conversations');

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.data, null);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    it('POST /api/chat/conversations returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/chat/conversations')
        .send({ listingId: 'some-listing-id' });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.data, null);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });
  });

  describe('Admin Moderation Console Endpoints', () => {
    it('GET /api/admin/verifications/pending returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/admin/verifications/pending');

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.data, null);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    it('GET /api/admin/students returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/admin/students');

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.data, null);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    it('GET /api/admin/reports returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/admin/reports');

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.data, null);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    it('GET /api/admin/audit-logs returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/admin/audit-logs');

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.data, null);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });
  });
});
