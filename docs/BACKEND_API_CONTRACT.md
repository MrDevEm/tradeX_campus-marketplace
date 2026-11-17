# tradeX Backend API & Database Contract (Developer 1 Specification)

**Project:** tradeX Campus Marketplace (Version 1.0)  
**Author:** Developer 3 (Authentication, Student Verification, Chat, Notifications & Admin)  
**Target:** Developer 1 (Backend, Database, PostgreSQL, Prisma, REST & WebSocket Architecture)  
**Status:** Approved & Implemented on Frontend (`ab-pro`)  
**Last Updated:** 2026-11-17  

---

## 1. Executive Summary

This document specifies the complete backend API, database models, real-time WebSocket contracts, and security rules established by Developer 3's frontend client implementation.

The tradeX frontend is structured to operate with zero friction:
1. **Offline Mode:** Built-in seed data and reactive simulation allow seamless UI testing when `VITE_API_BASE_URL` is omitted.
2. **Live Backend Mode:** Once Developer 1 deploys the REST API and WebSocket services, setting `VITE_API_BASE_URL` and `VITE_PUSHER_KEY` instantly switches the client to live production mode.

---

## 2. Complete Prisma Schema (`schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// -------------------------------------------------------------
// ENUMS
// -------------------------------------------------------------

enum UserRole {
  STUDENT
  ADMIN
  SUPERADMIN
}

enum UserStatus {
  PENDING_EMAIL_VERIFICATION
  PENDING_UPLOAD
  PENDING_APPROVAL
  APPROVED
  REJECTED
  SUSPENDED
}

enum ListingType {
  BUY
  SELL
  SWAP
}

enum ListingCondition {
  BRAND_NEW
  LIKE_NEW
  EXCELLENT
  GOOD
  FAIR
}

enum ListingStatus {
  ACTIVE
  PENDING_SWAP
  SOLD
  REMOVED
}

enum ReportTargetType {
  LISTING
  USER
  CHAT
}

enum ReportStatus {
  OPEN
  RESOLVED
  DISMISSED
}

enum ModerationAction {
  REMOVE_LISTING
  WARN_USER
  SUSPEND_USER
  DISMISS
}

enum NotificationType {
  CHAT
  VERIFICATION
  LISTING_OFFER
  CAMPUS_ALERT
}

// -------------------------------------------------------------
// MODELS
// -------------------------------------------------------------

model User {
  id                   String                 @id @default(uuid())
  email                String                 @unique
  passwordHash         String
  fullName             String
  role                 UserRole               @default(STUDENT)
  status               UserStatus             @default(PENDING_EMAIL_VERIFICATION)
  emailVerified        Boolean                @default(false)
  studentIdVerified    Boolean                @default(false)
  rejectionReason      String?
  createdAt            DateTime               @default(now())
  updatedAt            DateTime               @updatedAt

  studentProfile       StudentProfile?
  emailOtps            EmailOtp[]
  verificationRequests VerificationRequest[]
  listings             Listing[]
  sentMessages         ChatMessage[]          @relation("SentMessages")
  conversationsAsBuyer Conversation[]         @relation("BuyerConversations")
  conversationsAsSeller Conversation[]        @relation("SellerConversations")
  reportsFiled         ModerationReport[]     @relation("Reporter")
  reportsReceived      ModerationReport[]     @relation("ReportedUser")
  auditActions         AuditLog[]             @relation("Actor")
  notifications        CampusNotification[]

  @@index([email])
  @@index([status])
  @@index([role])
}

model StudentProfile {
  id           String   @id @default(uuid())
  userId       String   @unique
  studentId    String   @unique // e.g., UGR/1402/14
  university   String   @default("Addis Ababa University")
  department   String   // e.g., Software Engineering
  academicYear String   // e.g., 3rd Year / Class of 2026
  avatarUrl    String?
  trustScore   Int      @default(100)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model EmailOtp {
  id        String   @id @default(uuid())
  userId    String
  email     String
  otpCode   String   // 6-digit cryptographic random string
  expiresAt DateTime // 5 minutes validity
  used      Boolean  @default(false)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([email, otpCode])
}

model VerificationRequest {
  id              String     @id @default(uuid())
  userId          String
  idDocumentUrl   String     // Private S3 / local storage path (NEVER public)
  status          UserStatus @default(PENDING_APPROVAL)
  rejectionReason String?
  reviewedBy      String?    // Admin User ID
  reviewedAt      DateTime?
  submittedAt     DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status])
}

model Listing {
  id           String           @id @default(uuid())
  sellerId     String
  title        String
  category     String           // Books, Electronics, Dorm, Supplies, Clothing
  type         ListingType      @default(SELL)
  price        Decimal          @db.Decimal(10, 2)
  condition    ListingCondition @default(GOOD)
  campusSpot   String           // e.g., Main Library Plaza
  description  String           @db.Text
  images       String[]
  status       ListingStatus    @default(ACTIVE)
  viewsCount   Int              @default(0)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  seller       User             @relation(fields: [sellerId], references: [id], onDelete: Cascade)
  conversations Conversation[]
  reports      ModerationReport[]

  @@index([category])
  @@index([status])
  @@index([sellerId])
}

model Conversation {
  id             String         @id @default(uuid())
  listingId      String
  buyerId        String
  sellerId       String
  pinnedByBuyer  Boolean        @default(false)
  pinnedBySeller Boolean        @default(false)
  lastMessageAt  DateTime       @default(now())
  createdAt      DateTime       @default(now())

  listing        Listing        @relation(fields: [listingId], references: [id], onDelete: Cascade)
  buyer          User           @relation("BuyerConversations", fields: [buyerId], references: [id], onDelete: Cascade)
  seller         User           @relation("SellerConversations", fields: [sellerId], references: [id], onDelete: Cascade)
  messages       ChatMessage[]

  @@unique([listingId, buyerId, sellerId])
  @@index([lastMessageAt])
}

model ChatMessage {
  id               String        @id @default(uuid())
  conversationId   String
  senderId         String
  text             String        @db.Text
  mediaUrl         String?
  isMeetupProposal Boolean       @default(false)
  meetupSpotId     String?
  read             Boolean       @default(false)
  createdAt        DateTime      @default(now())

  conversation     Conversation  @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender           User          @relation("SentMessages", fields: [senderId], references: [id], onDelete: Cascade)
  meetupSpot       CampusMeetupSpot? @relation(fields: [meetupSpotId], references: [id])

  @@index([conversationId, createdAt])
}

model CampusMeetupSpot {
  id           String        @id @default(uuid())
  name         String        // e.g., Campus Gate 1 Security Checkpoint
  description  String
  safetyRating String        // e.g., Highest Security • 24/7 Monitored
  landmark     String        // e.g., Main Guard Pavilion
  messages     ChatMessage[]
}

model ModerationReport {
  id             String           @id @default(uuid())
  reporterId     String
  targetType     ReportTargetType
  listingId      String?
  reportedUserId String?
  reason         String
  details        String           @db.Text
  status         ReportStatus     @default(OPEN)
  actionTaken    ModerationAction?
  resolutionNote String?          @db.Text
  resolvedBy     String?          // Admin User ID
  resolvedAt     DateTime?
  createdAt      DateTime         @default(now())

  reporter       User             @relation("Reporter", fields: [reporterId], references: [id], onDelete: Cascade)
  reportedUser   User?            @relation("ReportedUser", fields: [reportedUserId], references: [id])
  listing        Listing?         @relation(fields: [listingId], references: [id])

  @@index([status])
}

model AuditLog {
  id         String   @id @default(uuid())
  actorId    String
  actorName  String
  action     String   // VERIFICATION_APPROVED, VERIFICATION_REJECTED, USER_SUSPENDED, REPORT_RESOLVE
  targetType String   // STUDENT, LISTING, USER
  targetName String
  notes      String?  @db.Text
  timestamp  DateTime @default(now())

  actor      User     @relation("Actor", fields: [actorId], references: [id], onDelete: Cascade)

  @@index([timestamp])
}

model CampusNotification {
  id         String           @id @default(uuid())
  userId     String
  type       NotificationType
  title      String
  message    String
  read       Boolean          @default(false)
  entityId   String?          // e.g., conversationId or listingId
  createdAt  DateTime         @default(now())

  user       User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, read])
}
```

---

## 3. REST API Endpoint Specifications

All endpoints prefix: `/api`  
Protected endpoints require: `Authorization: Bearer <jwt_token>`

### 3.1 Authentication & Student Identity (`/api/auth`)

| Method | Endpoint | Access | Request Body | Response (200/201) |
|---|---|---|---|---|
| `POST` | `/auth/register` | Public | `{ email, password, fullName, studentId, department, academicYear }` | `{ token, user: AuthUser }` |
| `POST` | `/auth/login` | Public | `{ email, password }` | `{ token, user: AuthUser }` |
| `POST` | `/auth/verify-email` | Public | `{ email, otp }` | `{ token, user: AuthUser }` |
| `POST` | `/auth/resend-otp` | Public | `{ email }` | `{ success: true, message: "OTP sent" }` |
| `POST` | `/auth/logout` | Authenticated | None | `{ success: true }` |
| `GET`  | `/auth/verification-status` | Authenticated | None | `VerificationStatus` |

### 3.2 Student ID Document Upload (`/api/verification`)

| Method | Endpoint | Access | Content-Type | Response (200) |
|---|---|---|---|---|
| `POST` | `/verification/upload-id` | Authenticated | `multipart/form-data` | `{ status: "PENDING_APPROVAL", idDocumentUrl }` |

### 3.3 Admin Console & Moderation (`/api/admin`)
*Requires `User.role IN ('ADMIN', 'SUPERADMIN')`*

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/admin/summary` | Returns pending queue count, active student count, open reports count, total listings. |
| `GET`  | `/admin/verifications` | Returns pending student ID verification requests with document scans and student dossier. |
| `POST` | `/admin/verifications/:id/approve` | Approves student ID, sets `status = APPROVED`, records audit log entry. |
| `POST` | `/admin/verifications/:id/reject` | Body: `{ reason: string }`. Sets `status = REJECTED`, stores rejection note, records audit log entry. |
| `GET`  | `/admin/students` | Query: `?q=&status=`. Returns registered students directory with trust scores and status. |
| `PATCH`| `/admin/students/:id/status` | Body: `{ status: UserStatus, reason?: string }`. Suspends or reinstates student account. |
| `GET`  | `/admin/reports` | Returns open campus moderation reports. |
| `POST` | `/admin/reports/:id/resolve` | Body: `{ action: ModerationAction, notes: string }`. Resolves report, takes action on target. |
| `GET`  | `/admin/audit-logs` | Returns chronological moderator action audit trail. |

### 3.4 Messaging & Safe Campus Meetup (`/api/conversations`)

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/conversations` | Lists current user's active conversations sorted by `lastMessageAt`. |
| `GET`  | `/conversations/:id` | Returns conversation thread with full message history and listing context strip. |
| `POST` | `/conversations/:id/messages` | Body: `{ text: string, img?: string, meetupSpotId?: string }`. Sends message and triggers real-time socket event. |
| `DELETE`| `/conversations/:id/messages/:mid` | Deletes a message from conversation thread. |
| `PATCH`| `/conversations/:id/pin` | Body: `{ pinned: boolean }`. Pins/unpins conversation in user inbox. |
| `POST` | `/conversations/:id/report` | Body: `{ reason: string, details: string }`. Submits peer safety report to admin queue. |

### 3.5 In-App Notifications (`/api/notifications`)

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/notifications` | Lists notifications for authenticated student (max 30). |
| `PATCH`| `/notifications/:id/read` | Marks single notification as read. |
| `POST` | `/notifications/read-all` | Marks all notifications as read for current user. |

---

## 4. WebSocket & Real-Time Specifications

The frontend expects standard Pusher / Socket.io channel abstractions:

### Channel 1: `private-chat-{conversationId}`
Subscribed to when `#modal-messaging` is open.
- **Event `new-message`**:
  ```json
  {
    "id": "msg-123",
    "conversationId": "conv-1",
    "senderId": "u-dawit-1",
    "text": "Sounds good! See you at Gate 1.",
    "isMeetupProposal": false,
    "time": "14:22"
  }
  ```
- **Event `typing`**:
  ```json
  {
    "conversationId": "conv-1",
    "sender": "Dawit M.",
    "isTyping": true
  }
  ```

### Channel 2: `private-user-{userId}`
Subscribed to whenever user is logged in.
- **Event `new-notification`**:
  ```json
  {
    "id": "notif-99",
    "type": "CHAT",
    "title": "New Message from Dawit M.",
    "message": "Can we meet at the Library Plaza?",
    "timestamp": "Just now",
    "read": false
  }
  ```
- **Event `verification-updated`**:
  ```json
  {
    "status": "APPROVED",
    "badge": "Verified Student"
  }
  ```

---

## 5. Security & Privacy Rules

1. **Private ID Document Storage:**
   Student ID photos (`VerificationRequest.idDocumentUrl`) must NEVER be exposed publicly or accessible to unauthenticated users. Access must be restricted strictly to reviewer admins.
2. **Campus Verification Lock:**
   Only users with `status = APPROVED` may post listings with 0% commission tier.
3. **Audit Trail Immutability:**
   Records in `AuditLog` must be append-only with no `UPDATE` or `DELETE` endpoints.

---

## 6. Verification Status

All frontend services and mock contracts defined in this specification have been verified:
- `npm run lint` (`tsc --noEmit`): **0 errors**
- `npm run build` (`vite build`): **0 errors**
- `npm test` (Integration suite): **16/16 tests passing**
