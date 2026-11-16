# tradeX

**tradeX** is a peer-to-peer university campus marketplace frontend where verified students can buy, sell, swap, and gift textbooks, electronics, clothing, accessories, and dorm essentials safely on campus.

---

## Project Overview

tradeX is built exclusively for campus communities to make peer-to-peer student trading fast, transparent, and local:

- **Zero commission fees**: Students arrange campus handovers in person at public campus spots (library lobbies, student unions, cafeterias).
- **Multiple exchange modes**: Supports direct **Buy / Sell** listings (in ETB), **Swap** barter listings, and **Free Corner** student giveaways.
- **Standalone & API-ready**: Runs immediately with realistic seed data when no backend URL is set, and automatically switches to live REST API calls when `VITE_API_BASE_URL` is configured.

---

## Main Frontend Features

- **Curved Product Showcase Carousel**: Interactive 12-item perspective arch carousel driven by `requestAnimationFrame` with pointer drag inertia, hover lift, and responsive unit scaling.
- **Responsive Floating Glass Navigation**: Desktop wave-arch hover/scroll-spy indicator paired with a mobile navigation drawer.
- **Category Explorer & Marketplace Feed**:
  - Staggered reveal category cards (`Electronics`, `Books & Study`, `Clothing & Shoes`, `Accessories`, `Free Corner`, `Other`).
  - Live keyword search, category pills, listing type filter (`Buy / Sell`, `Swap`, `Giveaway`), and price sorting (`Newest`, `Low to High`, `High to Low`).
  - Listing details modal with bookmark (`Save Item`) support and campus meeting spot display.
  - Create listing modal with drag-and-drop / file-picker photo upload and live image preview.
- **Obsidian Peer-to-Peer Chat Studio**:
  - Desktop three-pane / tablet slide-over / mobile tabbed layout (`Chats`, `Messages`, `Info & Media`).
  - Conversation search, pinning to top, listing context strip, photo attachments with full-screen lightbox preview, quick campus replies, and delete/clear actions with Undo toast recovery.
- **Student Authentication & Profile Overlay**:
  - Tabbed Sign In, Student Registration, and Identity Verification Status modal.
  - Student Profile overlay displaying summary metrics and active campus listings.

---

## Technologies Used

- **Build Tool**: Vite 8
- **Language**: TypeScript (`tsc --noEmit` strict type-checking)
- **Styling**: Modular CSS (`src/styles/base.css`, `src/styles/modals.css`, `src/styles/responsive.css`) with CSS custom properties and responsive media queries (`320px` through `1440px+`)
- **Browser APIs**: Web Animations API, SVG clip-paths & wave interpolation, `IntersectionObserver`, `FileReader`, `VisualViewport`, and `Fetch API` with `AbortController`

---

## Project Folder Structure

```text
.
├── index.html                  # Document shell, semantic sections, modals, and profile view
├── package.json                # Scripts and minimal Vite + TypeScript dependencies
├── tsconfig.json               # Strict TypeScript compiler configuration
├── vite.config.ts              # Vite dev server and path alias configuration
├── .env.example                # Environment variable template (no secrets)
├── public/
│   └── images/
│       ├── brand/              # tradeX brand mark
│       ├── listings/           # Campus listing photographs
│       └── products/           # Showcase & chat media images
└── src/
    ├── main.ts                 # Application bootstrap & modal backdrop/keyboard handlers
    ├── config/
    │   └── env.ts              # Environment configuration (VITE_API_BASE_URL)
    ├── data/
    │   └── marketplaceSeed.ts  # Initial seed listings, categories, and conversations
    ├── features/
    │   ├── auth.ts             # Auth modal tabs and login/register/verification handlers
    │   ├── carousel.ts         # Curved hero showcase physics & entrance animations
    │   ├── dashboard.ts        # Student profile overlay & dashboard metrics
    │   ├── marketplace.ts      # Categories, search/filter/sort, item details, create listing
    │   ├── messaging.ts        # Obsidian chat studio, attachments, lightbox, undo actions
    │   └── navbar.ts           # Glass navbar glow, wave-arch scroll spy, mobile menu
    ├── services/
    │   └── api/
    │       ├── client.ts       # Fetch wrapper with timeout, Bearer auth token, and ApiError
    │       ├── endpoints.ts    # Centralized REST endpoint path definitions
    │       ├── auth.service.ts
    │       ├── dashboard.service.ts
    │       ├── listings.service.ts
    │       ├── messaging.service.ts
    │       └── index.ts
    ├── styles/
    │   ├── base.css            # Design tokens, hero, sections, navbar, footer
    │   ├── modals.css          # Modals, Obsidian chat studio, profile overlay
    │   ├── responsive.css      # Mobile/tablet/desktop responsive breakpoints
    │   └── index.css           # Master stylesheet entry
    ├── types/
    │   └── marketplace.ts      # Shared TypeScript interfaces and payload types
    └── utils/
        └── html.ts             # HTML escaping helper for safe dynamic DOM templates
```

---

## Installation Instructions

1. Ensure **Node.js 18+** (and `npm`) is installed.
2. Install project dependencies:

```bash
npm install
```

---

## Development Instructions

Start the local Vite development server (configured for port `3000`):

```bash
npm run dev
```

Type-check all TypeScript source files without emitting build artifacts:

```bash
npm run lint
```

---

## Production Build Instructions

Build the optimized production bundle into `dist/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## Environment Variable Setup

Copy `.env.example` to `.env` when connecting to a backend API:

```bash
cp .env.example .env
```

Available variables:

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base URL of the tradeX REST backend (e.g., `https://api.example.com/api/v1`) | `""` (uses local seed data) |
| `APP_URL` | Public URL where the frontend app is hosted | `"MY_APP_URL"` |

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
