# tradeX Version 1.0

*Developer 1: Backend & Database*

Role-specific technical implementation guide for a three-developer team
using AI coding agents.

Document hierarchy: tradeX V1 Marketplace Implementation Specification
is the master reference. This document defines this developer's
responsibilities. Escalate contradictions through a reviewed GitHub
Issue; do not silently guess.

# Part A. Common project contract

## Purpose and scope

tradeX (Mekelle University Student Activities) Version 1.0 is a
university-only, responsive web Marketplace for desktop and mobile
browsers. Students buy/sell, swap, give away, lend/borrow and post
wanted items. Students communicate privately, then arrange payment and
handover themselves (Chat and Meet). No in-app payment processing.

## Shared foundation

One account per student, university email OTP plus student ID upload and
admin approval, student profiles, listings, saved items, messaging,
notifications, reports and an admin dashboard. No APK or separate native
mobile application.

## Explicit exclusions

Do not build sports challenges, Campus Express, City Orders, birthday
cakes, Telebirr, escrow, betting or outfit challenges in V1. Design
modules so future services can reuse authentication, profiles, chat and
notifications.

## Final technology baseline

TypeScript strict; Next.js App Router with React; Tailwind CSS;
shadcn/ui and Radix UI; PostgreSQL; Prisma; Auth.js credentials;
Argon2id; Resend; Zod; S3-compatible object storage via AWS SDK v3;
Pusher Channels; Vitest, React Testing Library, Playwright; ESLint,
Prettier; GitHub Actions; Vercel; Sentry. These choices follow the
master implementation specification.

## Shared architecture

One Next.js repository, with src/app for pages and API route handlers,
src/features for domain logic, src/components for presentation, src/lib
for infrastructure, prisma for schema/migrations, docs for
contracts/decisions, and e2e for browser tests.

## Data and API conventions

Use UUIDs, Prisma migrations, server-side Zod validation,
{data,error,meta} JSON responses, capped cursor pagination, and
server-side authorization. PostgreSQL is the authoritative datastore.
Never return password/OTP hashes or private ID storage keys.

## GitHub collaboration

One feature branch per issue, named feat/\<issue\>-\<feature\> or
fix/\<issue\>-\<feature\>; open PRs, require one teammate review and
passing lint/typecheck/tests/build. Do not push directly to main or
silently modify another developer's owned module.

## Agent working rules

Backend-first for each feature: schema/contracts → API → real request/DB
proof → UI → end-to-end proof. No mocked success, fake test output, or
placeholder endpoints. Each AI agent should implement one small issue at
a time and request review before changing shared contracts.

## Shared security requirements

All protected actions check session, account approval, ownership and
role on the server. Rate-limit sensitive endpoints; keep secrets out of
git; restrict student ID access; support reports, blocking and
moderation audit logs.

## Inputs not to invent

Real Mekelle University email domain(s), verified email sender domain,
provider credentials, admins, hosting/storage accounts, official
endorsement/branding permission, student ID retention policy and final
moderation rules must be supplied by the team.

## Shared repository layout

    musa/
      .github/workflows/ci.yml
      prisma/schema.prisma
      prisma/migrations/
      src/app/(public)/
      src/app/(student)/
      src/app/(admin)/admin/
      src/app/api/
      src/components/{ui,layout,marketplace,chat,forms}/
      src/features/{auth,verification,users,marketplace,messaging,notifications,moderation}/
      src/lib/{db,auth,permissions,storage,email,realtime}.ts
      src/types/
      src/test/
      e2e/
      docs/{api-contracts,architecture,decisions,runbook}.md
      .env.example
      README.md

# Part B. Your assigned work

Own the PostgreSQL schema, Prisma migrations, listing services, search,
saved items and marketplace APIs.

## Database and migrations

-   Implement User, Category, Listing, ListingImage, SavedListing and
    supporting models in coordination with Developer 3.
-   Use UUID identifiers, required foreign keys, unique constraints and
    indexes specified in the master document.
-   Create incremental Prisma migrations and deterministic seed data for
    local testing. Never reset teammates' shared databases.
-   Provide a reviewed schema change proposal before modifying User,
    Conversation, Message, Report or verification models.

## Marketplace domain logic

-   Implement SALE, SWAP, GIVEAWAY, LEND and WANTED listings with
    type-specific validation.
-   Enforce owner-only edits and closure; admins may moderate through
    explicitly authorized services.
-   Implement ACTIVE/RESERVED/CLOSED/REMOVED state changes and closure
    reasons.
-   Implement saved listings with unique user-listing pairs, plus
    category management and search/filter/pagination.

## API endpoints and contracts

-   GET /api/categories; GET /api/listings; GET /api/listings/:id
-   POST /api/listings; PATCH /api/listings/:id; POST
    /api/listings/:id/close
-   POST /api/listings/:id/images (signed upload); POST
    /api/saved-listings; DELETE /api/saved-listings/:listingId
-   Document request bodies, success/error responses, cursor pagination
    and permission behavior in docs/api-contracts.md.

## Coordination boundaries

-   Developer 3 owns authentication and approval logic; call shared
    requireApprovedUser()/requireRole() guards rather than implementing
    a second auth system.
-   Developer 2 owns page rendering and forms; agree on response JSON
    before building UI.
-   Developer 3 owns chat and moderation workflow; contribute database
    and permission reviews without taking ownership of their features.

## Required proof

-   Fresh database migration succeeds and seed loads.
-   Real API create/list/edit/close requests return expected statuses
    and persisted rows.
-   Unauthorized edits return 403; invalid inputs return 400/422; search
    and pagination work.

# Part C. Integration and handoff

1.  Before implementation: agree on shared schema and API contracts in
    docs/api-contracts.md.
2.  During implementation: keep PRs small, share contract changes
    immediately, and test against real services.
3.  Before merge: obtain teammate review, pass CI and update relevant
    documentation.
4.  Before release: complete an end-to-end journey from approved student
    login through listing discovery, chat and listing closure.

## Agent prompt template

Implement only GitHub Issue #\<number\> for Developer 1: Backend &
Database. Follow the tradeX V1 master specification and this role guide.
Check existing files and contracts first; do not replace teammates'
modules. Implement a small complete change, with tests. VERIFY: show (1)
relevant test command and final result, (2) one real API/UI outcome, (3)
one authorization or DB check. Keep verification short. Stop and ask if
a shared contract or real-world input is missing.

## Release readiness checklist

☐ No out-of-scope modules introduced

☐ All role-owned features have real tests

☐ Permission checks run on server

☐ No secrets or private IDs exposed

☐ PR approved and CI passing

☐ Handoff notes and API changes documented
