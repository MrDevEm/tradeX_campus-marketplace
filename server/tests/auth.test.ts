import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../app.ts';
import { prisma } from '../db/prisma.ts';

const app = createApp();

describe('Phase 2: Authentication & Backend Foundation Test Suite', () => {
  let authToken = '';
  const testEmail = `test.student.${Date.now()}@mu.edu.et`;
  const testStudentId = `UGR/${Date.now().toString().slice(-4)}/16`;

  after(async () => {
    // Cleanup created test student if exists
    try {
      const user = await prisma.user.findUnique({ where: { email: testEmail } });
      if (user) {
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch {
      // Ignore cleanup error
    }
    await prisma.$disconnect();
  });

  describe('PHASE 2.1: Foundation & Health Check', () => {
    it('GET /api/health returns 200 with healthy database status and envelope', async () => {
      const res = await request(app).get('/api/health');

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data, 'Expected envelope data to exist');
      assert.strictEqual(res.body.error, null);
      assert.strictEqual(res.body.data.status, 'healthy');
      assert.strictEqual(res.body.data.database, 'connected');
      assert.ok(res.body.meta?.timestamp, 'Expected timestamp in meta');
    });

    it('returns 404 with error envelope for non-existent route', async () => {
      const res = await request(app).get('/api/non-existent-route-xyz');

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.data, null);
      assert.strictEqual(res.body.error.code, 'NOT_FOUND');
      assert.ok(res.body.meta?.timestamp);
    });
  });

  describe('PHASE 2.2: Registration Flow', () => {
    it('POST /api/auth/register fails with 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'bad-email' });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
      assert.strictEqual(res.body.data, null);
    });

    it('POST /api/auth/register creates new student and returns JWT session in envelope', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Test Registration Student',
          email: testEmail,
          password: 'Password123!',
          studentId: testStudentId,
          department: 'Computer Science',
          academicYear: '2nd Year',
        });

      assert.strictEqual(res.status, 201);
      assert.ok(res.body.data, 'Expected data envelope');
      assert.strictEqual(res.body.error, null);

      const session = res.body.data;
      assert.ok(session.token, 'Expected JWT token to be returned');
      assert.strictEqual(session.user.email, testEmail);
      assert.strictEqual(session.user.fullName, 'Test Registration Student');
      assert.strictEqual(session.user.status, 'PENDING_EMAIL');
      assert.strictEqual(session.user.role, 'STUDENT');

      authToken = session.token;
    });

    it('POST /api/auth/register returns 409 when email already exists', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Duplicate Student',
          email: testEmail,
          password: 'Password123!',
          studentId: 'UGR/9999/99',
          department: 'Electrical',
          academicYear: '1st Year',
        });

      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.error.code, 'EMAIL_EXISTS');
    });
  });

  describe('PHASE 2.2: Login Flow', () => {
    it('POST /api/auth/login authenticates pre-seeded verified student (Dawit M.)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dawit.m@university.edu',
          password: 'Password123!',
        });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.token);
      assert.strictEqual(res.body.data.user.email, 'dawit.m@university.edu');
      assert.strictEqual(res.body.data.user.fullName, 'Dawit M.');
      assert.strictEqual(res.body.data.user.status, 'APPROVED');
      assert.strictEqual(res.body.data.user.verified, true);
    });

    it('POST /api/auth/login authenticates pre-seeded campus admin', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@mu.edu.et',
          password: 'Password123!',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.user.email, 'admin@mu.edu.et');
      assert.strictEqual(res.body.data.user.role, 'ADMIN');
    });

    it('POST /api/auth/login rejects incorrect password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dawit.m@university.edu',
          password: 'WrongPassword!',
        });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error.code, 'INVALID_CREDENTIALS');
    });

    it('POST /api/auth/login blocks suspended student account with 403', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'yared.b@campus.edu',
          password: 'Password123!',
        });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error.code, 'ACCOUNT_SUSPENDED');
    });
  });

  describe('PHASE 2.2: OTP Verification & Resend', () => {
    it('POST /api/auth/verify-email validates 6-digit OTP and advances status to PENDING_UPLOAD', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: testEmail,
          otp: '123456',
        });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.token);
      assert.strictEqual(res.body.data.user.email, testEmail);
      assert.strictEqual(res.body.data.user.status, 'PENDING_UPLOAD');
    });

    it('POST /api/auth/verify-email rejects invalid OTP code with 400', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: testEmail,
          otp: '000000',
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_OTP');
    });

    it('POST /api/auth/resend-otp generates new OTP for user', async () => {
      const res = await request(app)
        .post('/api/auth/resend-otp')
        .send({
          email: testEmail,
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.success, true);
      assert.strictEqual(res.body.data.message, 'OTP sent');
    });
  });

  describe('PHASE 2.2: Session & Verification Status', () => {
    it('GET /api/auth/verification-status requires Bearer token', async () => {
      const res = await request(app).get('/api/auth/verification-status');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    it('GET /api/auth/verification-status returns student tier and badge with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/verification-status')
        .set('Authorization', `Bearer ${authToken}`);

      assert.strictEqual(res.status, 200);
      const statusData = res.body.data;
      assert.strictEqual(statusData.status, 'PENDING_UPLOAD');
      assert.strictEqual(statusData.badge, 'ID Required');
      assert.strictEqual(statusData.emailConfirmed, true);
      assert.ok(statusData.feeTier);
    });

    it('GET /api/auth/session returns currently logged in user profile', async () => {
      const res = await request(app)
        .get('/api/auth/session')
        .set('Authorization', `Bearer ${authToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.user.email, testEmail);
    });

    it('POST /api/auth/logout succeeds with 200', async () => {
      const res = await request(app).post('/api/auth/logout');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.success, true);
    });
  });
});
