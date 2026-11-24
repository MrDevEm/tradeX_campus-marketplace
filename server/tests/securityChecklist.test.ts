import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../app.ts';
import { ENV } from '../config/env.ts';
import { hashPassword, verifyPassword, isArgon2Hash } from '../services/password.service.ts';
import {
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../services/token.service.ts';
import { prisma } from '../db/prisma.ts';
import { connectWithRetry } from '../services/dbRetry.service.ts';

describe('Backend API Pre-Deployment Checklist Verification', () => {
  before(async () => {
    await connectWithRetry(prisma, { maxRetries: 5, initialDelayMs: 1000 });
  });

  after(async () => {
    await prisma.$disconnect();
  });
  // -------------------------------------------------------------
  // 1. Environment Variables & Secret Separation
  // -------------------------------------------------------------
  it('Check 1: Environment Variables are isolated and JWT_SECRET is loaded from env', () => {
    assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must be defined');
    assert.ok(ENV.JWT_SECRET, 'JWT_SECRET must be configured');
    assert.notEqual(ENV.JWT_SECRET, '', 'JWT_SECRET must not be empty');
  });

  // -------------------------------------------------------------
  // 2. Authentication: Short-lived access tokens & revocable refresh tokens
  // -------------------------------------------------------------
  describe('Check 2: JWT Access Tokens and Revocable Refresh Tokens', () => {
    const testUser = {
      id: 'test-checklist-user-uuid',
      email: 'test.checklist@campus.edu',
      role: 'STUDENT',
      status: 'APPROVED',
    };

    it('signs access tokens with short-lived expiration (15m)', () => {
      const token = signAccessToken(testUser);
      assert.ok(token, 'Access token generated');
      const parts = token.split('.');
      assert.equal(parts.length, 3, 'Valid JWT structure');

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      assert.equal(payload.userId, testUser.id);
      // Expiration should be ~15m (900 seconds)
      const lifetimeSeconds = payload.exp - payload.iat;
      assert.ok(lifetimeSeconds <= 900, 'Access token lifetime must be short-lived (<= 900s / 15m)');
    });

    it('issues, rotates, and revokes refresh tokens via database tracking', async () => {
      let dbUser = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            email: 'token.test@campus.edu',
            passwordHash: await hashPassword('TestPass123!'),
            fullName: 'Token Tester',
            role: 'STUDENT',
            status: 'APPROVED',
          },
        });
      }

      // 1. Create refresh token
      const rawRefreshToken = await createRefreshToken(dbUser.id);
      assert.ok(rawRefreshToken, 'Raw refresh token issued');

      // 2. Rotate refresh token (exchanging old for new)
      const rotated = await rotateRefreshToken(rawRefreshToken);
      assert.ok(rotated.accessToken, 'New access token issued on rotation');
      assert.ok(rotated.refreshToken, 'New refresh token issued on rotation');
      assert.notEqual(rotated.refreshToken, rawRefreshToken, 'Rotated token must differ from initial token');

      // 3. Old refresh token cannot be reused
      await assert.rejects(
        async () => {
          await rotateRefreshToken(rawRefreshToken);
        },
        /revoked/i,
        'Reusing an already rotated token must be rejected'
      );

      // 4. Revocation on logout
      await revokeRefreshToken(rotated.refreshToken);
      await assert.rejects(
        async () => {
          await rotateRefreshToken(rotated.refreshToken);
        },
        /revoked/i,
        'Revoked refresh token must not be accepted'
      );

      // Cleanup tokens created during this test
      await prisma.refreshToken.deleteMany({ where: { userId: dbUser.id } }).catch(() => {});
    });
  });

  // -------------------------------------------------------------
  // 3. CORS Configuration
  // -------------------------------------------------------------
  describe('Check 3: CORS Strict Whitelist', () => {
    it('allows approved production domain tradex-campus.onrender.com', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://tradex-campus.onrender.com');

      assert.equal(res.status, 200);
      assert.equal(res.headers['access-control-allow-origin'], 'https://tradex-campus.onrender.com');
      assert.equal(res.headers['access-control-allow-credentials'], 'true');
    });

    it('allows approved admin dashboard domain tradex-admin-dashboard03.onrender.com', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://tradex-admin-dashboard03.onrender.com');

      assert.equal(res.status, 200);
      assert.equal(res.headers['access-control-allow-origin'], 'https://tradex-admin-dashboard03.onrender.com');
    });
  });

  // -------------------------------------------------------------
  // 4. Password Security: Argon2id
  // -------------------------------------------------------------
  describe('Check 4: Password Hashing with Argon2id', () => {
    it('generates Argon2id hashes with unique salts', async () => {
      const pwd = 'StudentPassword2026!';
      const hash1 = await hashPassword(pwd);
      const hash2 = await hashPassword(pwd);

      assert.ok(isArgon2Hash(hash1), 'Hash1 must be Argon2id format ($argon2id)');
      assert.ok(isArgon2Hash(hash2), 'Hash2 must be Argon2id format ($argon2id)');
      assert.notEqual(hash1, hash2, 'Unique salt required: two hashes of same password must differ');

      const valid1 = await verifyPassword(pwd, hash1);
      const valid2 = await verifyPassword(pwd, hash2);
      const invalid = await verifyPassword('WrongPassword123!', hash1);

      assert.equal(valid1, true);
      assert.equal(valid2, true);
      assert.equal(invalid, false);
    });

    it('gracefully handles legacy bcrypt hashes for seamless backward compatibility', async () => {
      // Known bcrypt hash for Password123!
      const legacyBcryptHash = '$2b$10$IzOOtnvj0ra/ybn8Lg.0muXMO3G/vtpk/415Kgl0x4hHfMpg0M2O.';
      const matches = await verifyPassword('Password123!', legacyBcryptHash);
      const mismatches = await verifyPassword('WrongPass', legacyBcryptHash);

      assert.equal(matches, true, 'Legacy bcrypt hash must verify correctly');
      assert.equal(mismatches, false, 'Invalid password against legacy bcrypt hash must fail');
    });
  });

  // -------------------------------------------------------------
  // 5. Input Validation with Zod
  // -------------------------------------------------------------
  describe('Check 5: Zod Schema Request Validation', () => {
    it('rejects malformed auth registration payload before reaching business logic', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: '123', // < 6 chars
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(res.body.error.details), 'Validation errors returned in structured format');
    });

    it('rejects malformed admin onboarding payload', async () => {
      const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      assert.ok(adminUser, 'Admin user must exist in database');

      const adminToken = signAccessToken(adminUser);

      const res = await request(app)
        .post('/api/admin/settings/admins')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          password: 'short',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });
  });

  // -------------------------------------------------------------
  // 6. Rate Limiting Headers
  // -------------------------------------------------------------
  describe('Check 6: API Rate Limiting', () => {
    it('rate limiter sets standard RFC rate limit headers on requests', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.ok(res.headers['x-ratelimit-limit'], 'X-RateLimit-Limit header must be present');
      assert.ok(res.headers['x-ratelimit-remaining'], 'X-RateLimit-Remaining header must be present');
      assert.ok(res.headers['x-ratelimit-reset'], 'X-RateLimit-Reset header must be present');
    });
  });

  // -------------------------------------------------------------
  // 9. Error Response Security
  // -------------------------------------------------------------
  describe('Check 9: Error Response Security & Sanitization', () => {
    it('does not leak internal stack traces or internal paths in API error envelope', async () => {
      const res = await request(app).get('/api/non-existent-route-for-testing-404');
      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'NOT_FOUND');
      assert.equal(res.body.stack, undefined, 'Stack trace must NEVER be sent in API response');
      assert.equal(res.body.error.stack, undefined, 'Error object stack trace must NEVER be sent');
    });
  });

  // -------------------------------------------------------------
  // 11. HTTPS & Security Headers
  // -------------------------------------------------------------
  describe('Check 11: Security Headers & Transport Security', () => {
    it('enforces comprehensive HTTP security headers', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);

      assert.equal(
        res.headers['strict-transport-security'],
        'max-age=31536000; includeSubDomains; preload',
        'HSTS header must be configured'
      );
      assert.equal(res.headers['x-content-type-options'], 'nosniff', 'nosniff header must be present');
      assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN', 'X-Frame-Options must be SAMEORIGIN');
      assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
      assert.ok(res.headers['permissions-policy'], 'Permissions-Policy must be configured');
    });
  });

  // -------------------------------------------------------------
  // 12. Authorization & RBAC
  // -------------------------------------------------------------
  describe('Check 12: Role-Based Access Control (RBAC)', () => {
    it('rejects unauthenticated requests to protected admin endpoints with 401', async () => {
      const res = await request(app).get('/api/admin/summary');
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('rejects student role tokens from accessing admin endpoints with 403 FORBIDDEN', async () => {
      const studentUser = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
      assert.ok(studentUser, 'Student user must exist in database');

      const studentToken = signAccessToken(studentUser);

      const res = await request(app)
        .get('/api/admin/summary')
        .set('Authorization', `Bearer ${studentToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    });
  });

  // -------------------------------------------------------------
  // 13. Health and Readiness Endpoints
  // -------------------------------------------------------------
  describe('Check 13: Liveness & Readiness Probes', () => {
    it('GET /api/health returns healthy liveness envelope', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'healthy');
      assert.ok(typeof res.body.data.uptime === 'number');
    });

    it('GET /api/health/ready verifies active database readiness', async () => {
      const res = await request(app).get('/api/health/ready');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'ready');
      assert.equal(res.body.data.database, 'connected');
      assert.ok(typeof res.body.data.latencyMs === 'number');
    });
  });
});
