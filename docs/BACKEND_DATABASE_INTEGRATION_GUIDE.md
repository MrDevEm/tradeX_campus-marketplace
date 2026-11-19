# Developer 1's message for Developer 2 & Developer 3

**Scope:** PostgreSQL Database, Prisma Schema, Marketplace REST APIs (Categories, Listings CRUD, Search/Filter, Saved Listings).  
**Branch / Target:** Neon PostgreSQL `development` branch (`br-crimson-violet-badciq7b`).  
**Verification:** 35 backend tests (19 marketplace + 16 auth) + 16 client tests passing; build clean.

---

## 🚀 Quick Start: Where to Start & How to Set Up

### 1. Where to Get Secret Keys & URLs
* **Secrets are NOT in Git:** Do not commit `.env`.
* **Take from Telegram:** Grab the real `DATABASE_URL` (Neon PostgreSQL) and `JWT_SECRET` directly from the Telegram message sent by Developer 1.
* **Paste into `.env`:** Create or update `.env` in your project root with the keys below.

```env
PORT=3001
NODE_ENV=development
# Paste real DATABASE_URL from Telegram:
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/neondb?sslmode=require"
# Paste real JWT_SECRET from Telegram:
JWT_SECRET="<secret-from-telegram>"
APP_URL="http://localhost:3000"

# FOR DEVELOPER 2 (FRONTEND):
# Add this line to connect the Vite client to live backend:
VITE_API_BASE_URL=http://localhost:3001/api
```

### 2. How to Start & Test
1. **Start the backend server:**
   ```bash
   npm run start:server
   ```
   *(Server starts on `http://localhost:3001`)*
2. **Start the frontend (Developer 2):**
   ```bash
   npm run dev
   ```
3. **Run all backend tests (Developer 3):**
   ```bash
   npm run test:backend
   ```
4. **Pre-Seeded Login Accounts (from Telegram):**
   * **Approved Student:** `student@mu.edu.et` / `Password123!`
   * **Campus Admin:** `admin@mu.edu.et` / `AdminSecret2026!`

---

## 2. Standard Envelope & Error Codes

All responses follow the canonical envelope:
```json
{
  "data": { ... } | [ ... ],
  "error": null | { "code": "VALIDATION_ERROR", "message": "..." },
  "meta": { "total": 10, "timestamp": "2026-11-18T17:25:00Z" }
}
```
*(Single-resource responses also preserve top-level keys for backwards compatibility with `src/services/api/client.ts`)*.

| Status | Code | Meaning |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request body or query params failed Zod schema checks. |
| `401` | `UNAUTHORIZED` | Missing or invalid `Authorization: Bearer <jwt>` header. |
| `403` | `FORBIDDEN` | Caller does not own the listing. |
| `403` | `VERIFICATION_REQUIRED` | Student account status is not `APPROVED` (required to post). |
| `404` | `LISTING_NOT_FOUND` | Listing ID not found in database. |

---

## 3. Marketplace Endpoints Reference

### 3.1 Overview Table

| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/api/categories` | Public | Active categories with live item counts. |
| `GET` | `/api/listings` | Public (Opt Auth) | Multi-criteria search, filters, sorting, and pagination. |
| `GET` | `/api/listings/:id` | Public (Opt Auth) | Single listing details; increments view count. |
| `POST` | `/api/listings` | Auth (`APPROVED`) | Create listing (`ACTIVE`). |
| `PATCH` | `/api/listings/:id` | Auth (Owner only) | Update listing fields. |
| `POST` | `/api/listings/:id/close` | Auth (Owner only) | Close listing with reason (`SOLD`, `SWAPPED`, `WITHDRAWN`, `REMOVED`). |
| `PATCH` | `/api/listings/:id/save` | Auth | Toggle save status (`{ saved: boolean }`). |
| `GET` | `/api/saved-listings` | Auth | Paginated list of student's saved listings. |
| `POST` | `/api/saved-listings` | Auth | Bookmark listing (idempotent upsert). |
| `DELETE` | `/api/saved-listings/:listingId` | Auth | Remove bookmark. |

### 3.2 Query & Mutation Contracts

* **`GET /api/listings` Query Params:**
  * `q` (string): Search title & description.
  * `category` (string): Slug or category name (`Books`, `Electronics`).
  * `type` (enum): `BUY`, `SELL`, `SWAP`, `GIVEAWAY`.
  * `condition` (enum): `BRAND_NEW`, `LIKE_NEW`, `GOOD`, `FAIR`.
  * `minPrice` / `maxPrice` (number): Price bounds.
  * `sort` (string): `newest` (default), `price-low`, `price-high`.
  * `limit` (int, 1-50, default 20) & `cursor` (string, listing ID).

* **`POST /api/listings` Body:**
  ```json
  {
    "title": "MacBook Pro 14\"",
    "category": "Electronics",
    "type": "SELL",
    "price": 88000,
    "condition": "LIKE_NEW",
    "campusSpot": "Engineering Quad (Hall 2)",
    "description": "Flawless battery health.",
    "images": ["https://images.unsplash.com/..."]
  }
  ```

* **`POST /api/listings/:id/close` Body:**
  ```json
  { "reason": "SOLD" } // Options: "SOLD" | "SWAPPED" | "WITHDRAWN" | "REMOVED"
  ```

* **`POST /api/saved-listings` Body:**
  ```json
  { "listingId": "item-uuid" }
  ```

---

## 4. Status Lifecycle & Saved Items

* **Lifecycle:** `ACTIVE` $\rightarrow$ `PENDING_SWAP` | `SOLD` | `REMOVED`. Inactive listings are excluded from public search by default. Soft deletion via `/close` preserves chat and audit history.
* **Saved Listings:** Backed by database constraint `@@unique([userId, listingId])`. Handled via Prisma `upsert` to eliminate race conditions on concurrent UI clicks.

---

## 5. Developer 2 (Frontend) Integration Guide

* **Base URL:** In `.env`, set `VITE_API_BASE_URL=http://localhost:3001/api`. The client automatically switches from mock data to live API calls.
* **Headers:** `client.ts` automatically attaches `Authorization: Bearer <token>` and `Content-Type: application/json`.
* **Envelope Handling:** Single resources preserve top-level keys (`res.id`, `res.title`) while list queries provide `res.data` and `res.meta`.
* **Image URLs:** Supports absolute URLs or local static assets (e.g. `/images/products/book.png` fallback).

---

## 6. Developer 3 Coordination: `optionalAuthenticateToken`

* **File:** [`server/middleware/auth.ts`](file:///home/emando/Desktop/myProject/tradeX_campus-marketplace/server/middleware/auth.ts#L92-L126).
* **Purpose:** Public marketplace endpoints (`GET /api/listings`, `GET /api/listings/:id`) must be visible to guests, but if a student is signed in, the response needs to populate `saved: true` and seller contextual flags.
* **Behavior:** Validates JWT if present; passes through cleanly (`req.user = undefined`) if missing or expired. Does not touch or alter Developer 3's strict `authenticateToken` or role-based guards.

---

## 7. Database Safety & Cascade Deletion Rules

* **User Deletion:** Deleting a `User` cascades to listings, profile, and messages. **Never run hard user delete in production;** use account suspension (`status = 'SUSPENDED'`).
* **Listing Deletion:** Never run hard SQL `DELETE` on listings; foreign keys on `Conversation` and `ModerationReport` require soft-closure via `POST /api/listings/:id/close` (`status = 'REMOVED'`).
