import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../app.ts';
import { prisma } from '../db/prisma.ts';
import { signUserToken } from '../middleware/auth.ts';
import { UserRole, UserStatus } from '@prisma/client';

const app = createApp();

describe('Phase 2: Developer 1 Marketplace Backend Test Suite', () => {
  let approvedStudentToken = '';
  let unapprovedStudentToken = '';
  let otherStudentToken = '';
  let approvedStudentId = '';
  let otherStudentId = '';
  let testListingId = '';

  before(async () => {
    // 1. Get pre-seeded approved student (Dawit M.)
    const dawit = await prisma.user.findUnique({
      where: { email: 'dawit.m@university.edu' },
    });
    if (!dawit) throw new Error('Seeded student dawit.m@university.edu not found');
    approvedStudentId = dawit.id;
    approvedStudentToken = signUserToken(dawit);

    // 2. Get pre-seeded pending/unapproved student (Sara Bekele)
    const sara = await prisma.user.findUnique({
      where: { email: 'sara.b@campus.edu' },
    });
    if (!sara) throw new Error('Seeded student sara.b@campus.edu not found');
    unapprovedStudentToken = signUserToken(sara);

    // 3. Get pre-seeded other student (Kalkidan Assefa)
    const kal = await prisma.user.findUnique({
      where: { email: 'kal.a@campus.edu' },
    });
    if (!kal) throw new Error('Seeded student kal.a@campus.edu not found');
    otherStudentId = kal.id;
    otherStudentToken = signUserToken(kal);
  });

  after(async () => {
    // Clean up test listing if created
    if (testListingId) {
      try {
        await prisma.savedListing.deleteMany({ where: { listingId: testListingId } });
        await prisma.listing.deleteMany({ where: { id: testListingId } });
      } catch {
        // Ignore cleanup
      }
    }
    await prisma.$disconnect();
  });

  // =========================================================
  // 1. Categories
  // =========================================================
  describe('Module: Categories Endpoint (/api/categories)', () => {
    it('GET /api/categories returns 200 with category list and item counts in envelope', async () => {
      const res = await request(app).get('/api/categories');

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data), 'Expected data to be an array of categories');
      assert.strictEqual(res.body.error, null);
      assert.ok(res.body.data.length >= 5);

      const electronics = res.body.data.find(
        (c: { name: string }) => c.name === 'Electronics'
      );
      assert.ok(electronics, 'Expected Electronics category to exist');
      assert.ok(electronics.count.includes('items'), 'Expected formatted item count');
    });
  });

  // =========================================================
  // 2. Marketplace Listings: Browsing, Search & Filter
  // =========================================================
  describe('Module: Listings Browsing, Search & Filters (/api/listings)', () => {
    it('GET /api/listings returns list of active listings with standard envelope and meta', async () => {
      const res = await request(app).get('/api/listings');

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.strictEqual(res.body.error, null);
      assert.ok(res.body.meta?.total !== undefined);

      const first = res.body.data[0];
      assert.ok(first.id);
      assert.ok(first.title);
      assert.ok(first.price !== undefined);
      assert.ok(first.type);
      assert.ok(first.typeClass);
      assert.ok(first.seller);
    });

    it('GET /api/listings?category=Books filters listings by category', async () => {
      const res = await request(app).get('/api/listings?category=Books');

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length > 0);
      for (const item of res.body.data) {
        assert.strictEqual(item.category, 'Books');
      }
    });

    it('GET /api/listings?q=MacBook searches listings by keyword in title/desc', async () => {
      const res = await request(app).get('/api/listings?q=MacBook');

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length > 0);
      assert.ok(res.body.data[0].title.includes('MacBook'));
    });

    it('GET /api/listings?type=Swap filters listings by SWAP transaction type', async () => {
      const res = await request(app).get('/api/listings?type=Swap');

      assert.strictEqual(res.status, 200);
      for (const item of res.body.data) {
        assert.strictEqual(item.type, 'Swap');
      }
    });

    it('GET /api/listings?sort=price-low sorts listings by price ascending', async () => {
      const res = await request(app).get('/api/listings?sort=price-low');

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length >= 2);
      const prices = res.body.data.map((l: { price: number }) => l.price);
      assert.ok(prices[0] <= prices[1], 'Expected prices to be in ascending order');
    });

    it('GET /api/listings/:id returns 200 with single listing details and increments view', async () => {
      // Fetch any existing listing ID
      const listRes = await request(app).get('/api/listings?limit=1');
      const target = listRes.body.data[0];

      const res = await request(app).get(`/api/listings/${target.id}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.id, target.id);
      assert.strictEqual(res.body.data.title, target.title);
      assert.strictEqual(res.body.error, null);
    });

    it('GET /api/listings/:id returns 404 for non-existent listing ID', async () => {
      const res = await request(app).get('/api/listings/00000000-0000-0000-0000-000000000000');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error.code, 'LISTING_NOT_FOUND');
    });
  });

  // =========================================================
  // 3. Marketplace Listings: Creation & Authorization
  // =========================================================
  describe('Module: Listings Creation & Authorization', () => {
    it('POST /api/listings fails with 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/listings')
        .send({
          title: 'Unauthorized Item',
          category: 'Electronics',
          price: 500,
        });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    it('POST /api/listings fails with 403 when user is not an APPROVED student', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${unapprovedStudentToken}`)
        .send({
          title: 'Pending Student Item',
          category: 'Electronics',
          price: 1500,
          condition: 'LIKE_NEW',
          campusSpot: 'Main Library Plaza',
          description: 'Selling my graphing calculator.',
        });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error.code, 'VERIFICATION_REQUIRED');
    });

    it('POST /api/listings succeeds with 201 for approved student and returns created listing', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${approvedStudentToken}`)
        .send({
          title: 'Dell UltraSharp 27" 4K Monitor',
          category: 'Electronics',
          type: 'SELL',
          price: 24000,
          condition: 'LIKE_NEW',
          campusSpot: 'Engineering Quad (Hall 2)',
          description: 'Pristine 4K IPS display with USB-C 90W power delivery. Perfect for dual-screen setups.',
          images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80'],
        });

      assert.strictEqual(res.status, 201);
      assert.ok(res.body.data.id);
      assert.strictEqual(res.body.data.title, 'Dell UltraSharp 27" 4K Monitor');
      assert.strictEqual(res.body.data.seller, 'Dawit M.');
      assert.strictEqual(res.body.data.status, 'ACTIVE');

      testListingId = res.body.data.id;
    });
  });

  // =========================================================
  // 4. Marketplace Listings: Ownership & Updates
  // =========================================================
  describe('Module: Ownership Enforcement & Updates', () => {
    it('PATCH /api/listings/:id fails with 403 when editor is NOT the listing owner', async () => {
      const res = await request(app)
        .patch(`/api/listings/${testListingId}`)
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .send({
          title: 'Hacked Title By Other User',
          price: 100,
        });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    it('PATCH /api/listings/:id succeeds with 200 when updated by owner', async () => {
      const res = await request(app)
        .patch(`/api/listings/${testListingId}`)
        .set('Authorization', `Bearer ${approvedStudentToken}`)
        .send({
          title: 'Dell UltraSharp 27" 4K Monitor (Price Reduced)',
          price: 22500,
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.title, 'Dell UltraSharp 27" 4K Monitor (Price Reduced)');
      assert.strictEqual(res.body.data.price, 22500);
    });
  });

  // =========================================================
  // 5. Marketplace Transaction Statuses & Closure
  // =========================================================
  describe('Module: Transaction Statuses & Listing Closure', () => {
    it('POST /api/listings/:id/close fails with 403 when closer is NOT the owner', async () => {
      const res = await request(app)
        .post(`/api/listings/${testListingId}/close`)
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .send({ reason: 'SOLD' });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    it('POST /api/listings/:id/close closes listing with status SOLD when closed by owner', async () => {
      const res = await request(app)
        .post(`/api/listings/${testListingId}/close`)
        .set('Authorization', `Bearer ${approvedStudentToken}`)
        .send({ reason: 'SOLD' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'SOLD');
    });

    it('DELETE /api/listings/:id removes listing when requested by owner', async () => {
      const createRes = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${approvedStudentToken}`)
        .send({
          title: 'Temporary Item to Delete',
          category: 'Supplies',
          price: 50,
          condition: 'FAIR',
          campusSpot: 'Student Union Lounge (Ground Floor)',
          description: 'Will be deleted in automated test.',
          type: 'SELL',
        });
      const tempId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/listings/${tempId}`)
        .set('Authorization', `Bearer ${approvedStudentToken}`);

      assert.strictEqual(deleteRes.status, 200);
      assert.strictEqual(deleteRes.body.data.status, 'REMOVED');
    });
  });

  // =========================================================
  // 6. Saved Listings
  // =========================================================
  describe('Module: Saved Listings (/api/saved-listings & /api/listings/:id/save)', () => {
    it('POST /api/saved-listings saves a listing for authenticated student', async () => {
      const res = await request(app)
        .post('/api/saved-listings')
        .set('Authorization', `Bearer ${approvedStudentToken}`)
        .send({ listingId: testListingId });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.saved, true);
      assert.strictEqual(res.body.data.listingId, testListingId);
    });

    it('GET /api/saved-listings returns saved listings for current user', async () => {
      const res = await request(app)
        .get('/api/saved-listings')
        .set('Authorization', `Bearer ${approvedStudentToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      const hasItem = res.body.data.some((l: { id: string }) => l.id === testListingId);
      assert.ok(hasItem, 'Expected saved listings to include testListingId');
    });

    it('DELETE /api/saved-listings/:listingId removes listing from saved list', async () => {
      const res = await request(app)
        .delete(`/api/saved-listings/${testListingId}`)
        .set('Authorization', `Bearer ${approvedStudentToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.saved, false);

      const checkRes = await request(app)
        .get('/api/saved-listings')
        .set('Authorization', `Bearer ${approvedStudentToken}`);
      const hasItem = checkRes.body.data.some((l: { id: string }) => l.id === testListingId);
      assert.strictEqual(hasItem, false, 'Expected testListingId to be removed');
    });

    it('PATCH /api/listings/:id/save toggles save state matching frontend contract', async () => {
      // 1. Toggle ON
      const toggleOnRes = await request(app)
        .patch(`/api/listings/${testListingId}/save`)
        .set('Authorization', `Bearer ${approvedStudentToken}`)
        .send({ saved: true });

      assert.strictEqual(toggleOnRes.status, 200);
      assert.strictEqual(toggleOnRes.body.data.saved, true);

      // 2. Toggle OFF
      const toggleOffRes = await request(app)
        .patch(`/api/listings/${testListingId}/save`)
        .set('Authorization', `Bearer ${approvedStudentToken}`)
        .send({ saved: false });

      assert.strictEqual(toggleOffRes.status, 200);
      assert.strictEqual(toggleOffRes.body.data.saved, false);
    });
  });
});
