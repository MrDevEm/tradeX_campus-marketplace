import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.ts';
import { ENV } from '../config/env.ts';
import { prisma } from '../db/prisma.ts';

describe('Feature: S3 & Object Storage Service (/api/upload)', () => {
  const app = createApp();
  let studentToken: string;

  before(async () => {
    const student = await prisma.user.findUnique({
      where: { email: 'student@mu.edu.et' },
    });

    if (student) {
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

  describe('POST /api/upload/presigned-url', () => {
    it('returns 401 UNAUTHORIZED when no token is provided', async () => {
      const res = await request(app).post('/api/upload/presigned-url').send({
        filename: 'textbook.jpg',
        contentType: 'image/jpeg',
      });
      assert.strictEqual(res.status, 401);
    });

    it('generates presigned upload URL payload for authenticated student', async () => {
      if (!studentToken) return;

      const res = await request(app)
        .post('/api/upload/presigned-url')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          filename: 'macbook.png',
          contentType: 'image/png',
          folder: 'listings',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.error, null);
      assert(res.body.data.uploadUrl);
      assert(res.body.data.fileUrl);
      assert(res.body.data.key.startsWith('listings/'));
    });
  });

  describe('POST /api/upload/direct & Base64 Offloading', () => {
    const sampleBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    it('offloads base64 images to storage URL and avoids database bloat', async () => {
      if (!studentToken) return;

      const res = await request(app)
        .post('/api/upload/direct')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          image: sampleBase64,
          folder: 'listings',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.error, null);
      assert(res.body.data.fileUrl.startsWith('http'));
      assert(!res.body.data.fileUrl.startsWith('data:image/'));
    });

    it('POST /api/listings automatically offloads base64 payloads so DB stores clean URLs', async () => {
      if (!studentToken) return;

      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Calculus 9th Edition with Photo',
          category: 'Books',
          price: 450,
          condition: 'LIKE_NEW',
          campusSpot: 'Main Library Plaza (North Entrance)',
          description: 'Includes CD and formula sheet.',
          type: 'SELL',
          images: [sampleBase64],
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.error, null);
      // Verify image in listing response is a clean HTTP URL, NOT a base64 string
      const storedImage = res.body.data.images[0];
      assert(storedImage.startsWith('http'));
      assert(!storedImage.startsWith('data:image/'));
    });
  });
});
