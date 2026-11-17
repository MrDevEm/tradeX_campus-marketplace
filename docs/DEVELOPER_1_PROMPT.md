# Instructions for Developer 1: Backend & Database (tradeX V1.0)

Welcome to the **tradeX** project! You are **Developer 1**, responsible for the **PostgreSQL database, Prisma ORM schema & migrations, REST API server, and real-time WebSocket communication**.

---

## 1. Project Context & Current Architecture

- **Repository Stack:** The repository currently houses the responsive web client built with TypeScript and Vite.
- **Frontend Status:** The frontend (Marketplace UI, Auth OTP flows, Student ID Verification, In-app Chat with Safe Meetup Spots, Notifications, and Admin Console) is **already implemented and tested**.
- **Dual-Mode Frontend Client:** The frontend services in `src/services/api/` operate seamlessly:
  - When `VITE_API_BASE_URL` is unset, the frontend runs offline with mock data.
  - As soon as you spin up your backend server and point `VITE_API_BASE_URL` (e.g., `http://localhost:3000/api`), the frontend switches automatically to live HTTP/WebSocket requests.
- **Integration Test Suite:** There is an automated test suite in `tests/integration.test.ts` (16 passing tests) runnable via `npm test`.

---

## 2. Your Reference Documents in the Repository

Before writing code, inspect these documents in the `docs/` directory:
1. **`docs/tradeX_V1_Developer_1_Backend_Database.md`**: Your role specification and ownership boundaries.
2. **`docs/BACKEND_API_CONTRACT.md`**: **The canonical specification.** Contains the exact Prisma schema (`schema.prisma`), all REST endpoint paths, request bodies, response formats (`{ data, error, meta }`), WebSocket event signatures, and seed data.
3. **`docs/developer-3-progress.md`**: Implementation history and UI contract expectations.

---

## 3. Your Step-by-Step Deliverables

### Step 1: Clone & Setup
1. Clone the `main` branch:
   ```bash
   git clone git@github.com:MrDevEm/tradeX_campus-marketplace.git
   cd tradeX_campus-marketplace
   npm install
   ```
2. Create your feature branch (e.g., `git checkout -b feat/backend-prisma-api`).

### Step 2: Database Setup & Prisma Migrations
1. Set up a PostgreSQL database (local or cloud instance e.g., Neon).
2. Create `prisma/schema.prisma` using the exact schema provided in **Section 2 of `docs/BACKEND_API_CONTRACT.md`**:
   - Models: `User`, `StudentVerification`, `Listing`, `ListingImage`, `Category`, `SavedListing`, `Conversation`, `Message`, `Notification`, `Report`, `ModerationLog`.
   - Enums: `UserRole`, `UserStatus`, `ListingType`, `ListingCondition`, `ListingStatus`, `ReportTargetType`, `ReportStatus`, `ModerationAction`, `NotificationType`.
3. Generate and run the initial migration:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Build `prisma/seed.ts` following **Section 7 of `docs/BACKEND_API_CONTRACT.md`** (standard categories, pre-approved student account `student@mu.edu.et`, admin account `admin@mu.edu.et`, initial campus listings, and safe meetup spots). Run:
   ```bash
   npx prisma db seed
   ```

### Step 3: Implement the Backend REST API Server
Build the backend server (Fastify, Express, or your chosen Node framework) with CORS enabled for `http://localhost:5173` (with credentials).

Implement the endpoints defined in **Section 4 of `docs/BACKEND_API_CONTRACT.md`**:
- **Authentication:**
  - `POST /api/auth/send-otp` (Generate 6-digit OTP, send via email service, store hashed OTP with 5-minute expiry)
  - `POST /api/auth/verify-otp` (Verify OTP, issue JWT / session cookie)
  - `GET /api/auth/session` (Validate current session user)
- **Student ID Verification:**
  - `POST /api/verification/upload-id` (Handle multipart/signed S3 image upload, create `StudentVerification` record, set status to `PENDING_APPROVAL`)
  - `GET /api/verification/status`
- **Marketplace Listings:**
  - `GET /api/categories`
  - `GET /api/listings` (Cursor-based pagination, filters by category, type: BUY/SELL/SWAP, status: ACTIVE)
  - `GET /api/listings/:id`
  - `POST /api/listings` (Require approved student session)
  - `PATCH /api/listings/:id` (Owner-only edit)
  - `POST /api/listings/:id/close` (Close with reason: SOLD, SWAPPED, WITHDRAWN)
- **Saved Listings:**
  - `GET /api/saved-listings`
  - `POST /api/saved-listings`
  - `DELETE /api/saved-listings/:listingId`
- **Chat & Messaging:**
  - `GET /api/chat/conversations`
  - `POST /api/chat/conversations` (Create or return existing conversation for a listing)
  - `GET /api/chat/conversations/:id/messages`
  - `POST /api/chat/conversations/:id/messages` (Persist message + trigger real-time dispatch)
- **In-App Notifications:**
  - `GET /api/notifications`
  - `POST /api/notifications/:id/read`
  - `POST /api/notifications/read-all`
- **Admin Console (Role: ADMIN / SUPERADMIN only):**
  - `GET /api/admin/verifications/pending`
  - `POST /api/admin/verifications/:id/review` (Approve / Reject with rejection reason)
  - `GET /api/admin/students` & `PATCH /api/admin/students/:id/status` (Suspend / Reactivate)
  - `GET /api/admin/reports` & `POST /api/admin/reports/:id/action` (Remove listing, warn user, suspend)
  - `GET /api/admin/audit-logs`

### Step 4: Real-Time Event Dispatch (Pusher / WebSocket)
Follow **Section 5 of `docs/BACKEND_API_CONTRACT.md`**:
- Channel: `private-chat-{conversationId}` -> Events: `message:sent`, `user:typing`, `meetup:selected`
- Channel: `private-user-{userId}` -> Event: `notification:new`

### Step 5: Verification & Integration Proof
1. Start your backend server (e.g. on port `3000`).
2. Update `.env` in the root:
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api
   ```
3. Run `npm test` to verify that all 16 client integration tests pass against the live API.
4. Run `npm run dev` and verify that the full end-to-end journey works:
   - Login via OTP -> browse listings -> create listing -> save listing -> chat with seller -> admin verification approval.

---

## 4. Working Rules & Constraints

1. **Do not modify frontend files in `src/`** without coordinating with Developer 2 (UI) or Developer 3 (Auth/Chat/Admin).
2. **Follow the response envelope:** All responses must conform to:
   ```json
   {
     "data": { ... },
     "error": null,
     "meta": { "timestamp": "...", "page": 1 }
   }
   ```
3. **Open a Pull Request:** When done, push your branch and open a PR into `main` with:
   - Database migration files under `prisma/migrations/`
   - Seed script proof
   - Server route handlers and tests
