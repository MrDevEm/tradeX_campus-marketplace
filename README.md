# tradeX

**tradeX** is a full-stack peer-to-peer university campus marketplace where verified students can buy, sell, swap, and gift textbooks, electronics, clothing, accessories, and dorm essentials safely on campus.

The project pairs a responsive web client with a high-performance **Node.js/Express + Prisma ORM** backend powered by serverless **Neon PostgreSQL**.

---

## Project Overview

tradeX is built exclusively for university communities to make peer-to-peer student trading fast, transparent, and local:

- **Zero commission fees**: Students arrange campus handovers in person at public campus spots (library lobbies, student unions, cafeterias).
- **Multiple exchange modes**: Supports direct **Buy / Sell** listings (in ETB), **Swap** barter listings, and **Free Corner** student giveaways.
- **Relational Integrity**: Powered by PostgreSQL with 13 canonical Prisma models, strict foreign key constraints, indexes, and soft-closure state machines.
- **Dual-Mode Frontend Client**: Runs immediately with mock seed data when offline, and automatically connects to the live backend when `VITE_API_BASE_URL` is set.

---

## Main Features

### 🛒 Frontend & Marketplace UI
- **Curved Product Showcase Carousel**: Interactive 12-item perspective arch carousel driven by `requestAnimationFrame` with drag inertia.
- **Floating Glass Navigation**: Wave-arch indicator with responsive drawer for mobile devices.
- **Category Explorer & Marketplace Feed**:
  - Filter by category (`Electronics`, `Books & Study`, `Clothing & Shoes`, `Accessories`, `Free Corner`, `Other`).
  - Full-text search, listing type filter (`Buy / Sell`, `Swap`, `Giveaway`), and sorting (`Newest`, `Price Low/High`).
  - Listing details modal with bookmarking and verified campus meetup spot display.
  - Create listing modal with image preview and validation.
- **Obsidian Peer-to-Peer Chat Studio**:
  - Split-pane layout with conversation pinning, listing context strips, quick campus replies, and safe meetup spot proposals.
- **Student Authentication & Review Console**:
  - Email OTP verification, Student ID upload, and reactive approval status badges.
  - Admin review console for verification, directory suspension, and moderation.

### ⚡ Backend & Database Architecture
- **Marketplace REST APIs**: Complete CRUD for listings, multi-criteria filtering, live category item counts, and soft deletion (`/close`).
- **Standard Response Envelope**: Consistent `{ "data": ..., "error": null, "meta": ... }` envelope across all endpoints.
- **Server-Side Validation & Security**: Zod request schema validation, ownership guards, and student status checks (`APPROVED` required to post).
- **Saved Listings (Bookmarks)**: Concurrent, race-condition-safe bookmarking via Prisma `upsert` and composite keys.
- **Neon Serverless PostgreSQL**: Automatic branching, connection pooling, and migration history.

---

## Technologies Used

- **Frontend**: Vite 8, TypeScript, Modular CSS, SVG clip-paths, Web Animations API
- **Backend**: Node.js, Express, TypeScript (`tsx`)
- **Database & ORM**: Neon PostgreSQL, Prisma Client v6.19.3
- **Validation & Auth**: Zod, JSON Web Tokens (`jsonwebtoken`), `bcryptjs`
- **Testing**: Node Native Test Runner, Supertest

---

## Project Folder Structure

```text
.
├── prisma/
│   ├── schema.prisma           # 13 canonical database models, enums & relations
│   ├── seed.ts                 # Database seed script (categories, spots, accounts)
│   └── migrations/             # Incremental migration history
├── server/
│   ├── app.ts                  # Express application setup, routes & CORS
│   ├── index.ts                # Server entry point (port 3001)
│   ├── config/env.ts           # Centralized environment variable validation
│   ├── db/prisma.ts            # Prisma client singleton
│   ├── controllers/            # Marketplace, category, auth & saved listing logic
│   ├── routes/                 # Express API routes
│   ├── middleware/             # Standard envelope, error handler, Zod validator, auth
│   ├── validators/             # Server-side Zod request schemas
│   └── tests/                  # Backend & marketplace integration tests
├── src/
│   ├── main.ts                 # Application bootstrap
│   ├── features/               # Auth, carousel, dashboard, marketplace, chat
│   ├── services/api/           # HTTP client, endpoints, and API service layer
│   └── styles/                 # Modular CSS architecture
├── docs/                       # API contracts, design system, and team handoff guides
├── tests/                      # Frontend integration test suite
├── package.json
└── vite.config.ts
```

---

## Installation & Setup

1. Ensure **Node.js 20+** and `npm` are installed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your local `.env` (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

---

## Running the Project

### Start the Backend Server (Port 3001)
```bash
npm run start:server
```

### Start the Frontend Client (Port 3000)
```bash
npm run dev
```

---

## Running Tests

| Test Command | Description |
|---|---|
| `npm run test:backend` | Runs complete backend test suite (35 tests) |
| `npm run test:marketplace` | Runs marketplace API tests (19 tests) |
| `npm test` | Runs frontend client integration tests (16 tests) |
| `npm run lint` | Type-checks all TypeScript files (`tsc --noEmit`) |
| `npm run build` | Builds optimized client production bundle into `dist/` |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL pooled connection string | Required in `.env` |
| `JWT_SECRET` | Secret key for signing authentication tokens | Required in `.env` |
| `PORT` | Backend server port | `3001` |
| `VITE_API_BASE_URL` | Frontend API base URL | `http://localhost:3001/api` |
| `APP_URL` | Public frontend URL for CORS | `http://localhost:3000` |

---

## Documentation Links

- [Developer 1's Message for Developer 2 & 3](docs/Developer%201's%20message%20for%20Developer%202%20%26%20Developer%203.md) — Quick start and integration guide for teammates.
- [Canonical Backend Contract](docs/BACKEND_API_CONTRACT.md) — Technical database and API contract.
- [Design System Guide](docs/DESIGN_SYSTEM.md) — UI tokens and design specifications.


Never commit `.env` or real API credentials to version control.

---

## Backend Integration Information

All HTTP communication is centralized under `src/services/api/`:

- **HTTP Client (`src/services/api/client.ts`)**: Handles JSON requests, `12s` request timeouts, `ApiError` normalization, and automatic `Authorization: Bearer <token>` injection from `localStorage` (`tradex_auth_token`).
- **Configured Endpoints (`src/services/api/endpoints.ts`)**:
  - Auth: `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `GET /auth/verification-status`
  - Listings: `GET /listings`, `GET /listings/:id`, `POST /listings`, `PATCH /listings/:id/save`
  - Messaging: `GET /conversations`, `DELETE /conversations/:id`, `POST /conversations/:id/messages`, `DELETE /conversations/:id/messages`, `DELETE /conversations/:id/messages/:messageId`, `PATCH /conversations/:id/pin`, `POST /conversations/:id/report`
  - Dashboard: `GET /dashboard/summary`, `GET /dashboard/listings`
- **Fallback Behavior**: Because this repository contains only the frontend client, calls are gated by `isApiConfigured()`. When `VITE_API_BASE_URL` is empty, the application operates offline using the typed seed data in `src/data/marketplaceSeed.ts`.

---

## Notes for Future Developers

- Align backend route prefixes or payload DTOs inside `src/services/api/endpoints.ts` and `src/types/marketplace.ts` if your backend routes differ from the defaults above.
- Ensure your backend enables CORS for the frontend origin (`http://localhost:3000` during local development) and allows the `Authorization` and `Content-Type` headers.
- File uploads (`createListing` and photo attachments in chat) currently send base64 `imageDataUrl` / `img` payloads; switch `client.ts` calls to `FormData` if your backend prefers `multipart/form-data` uploads (`client.ts` already skips setting `Content-Type` automatically when `FormData` is passed).
