import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// In-memory browser environment shim for Node.js test runner
if (!globalThis.localStorage) {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as unknown as Storage;
}

if (!globalThis.window) {
  globalThis.window = globalThis as unknown as Window & typeof globalThis;
}

import {
  authService,
  adminService,
  chatService,
  CAMPUS_MEETUP_SPOTS,
  notificationService,
} from '../src/services/api/index.ts';

describe('tradeX Developer 3 Integration Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // =========================================================
  // 1. Authentication & Student Verification Tests
  // =========================================================
  describe('Phase 1.1: Authentication & Verification Flow', () => {
    it('authenticates a student, stores session, and notifies subscribers', async () => {
      let notifiedUserEmail = '';
      const unsubscribe = authService.subscribe((user) => {
        if (user) notifiedUserEmail = user.email;
      });

      const session = await authService.login({
        email: 'dawit.m@university.edu',
        password: 'Password123!',
      });

      assert.ok(session, 'Expected login session to be created');
      assert.strictEqual(session.user.email, 'dawit.m@university.edu');
      assert.strictEqual(session.user.fullName, 'Dawit M.');
      assert.strictEqual(notifiedUserEmail, 'dawit.m@university.edu');
      assert.strictEqual(authService.isAuthenticated(), true);

      unsubscribe();
    });

    it('validates 6-digit email OTP verification correctly', async () => {
      const validSession = await authService.verifyEmail({
        email: 'dawit.m@university.edu',
        otp: '123456',
      });
      assert.ok(validSession);
      assert.strictEqual(validSession.user.email, 'dawit.m@university.edu');
      assert.strictEqual(validSession.user.status, 'PENDING_UPLOAD');
    });

    it('updates student ID verification status upon upload', async () => {
      await authService.login({
        email: 'student.test@campus.edu',
        password: 'Password123!',
      });

      const uploadRes = await authService.uploadStudentId({
        idDocumentDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        fileName: 'student_id_scan.png',
      });

      assert.strictEqual(uploadRes.status, 'PENDING_APPROVAL');

      const status = await authService.getVerificationStatus();
      assert.strictEqual(status.status, 'PENDING_APPROVAL');
      assert.strictEqual(status.idDocumentUploaded, true);
      assert.ok(status.badge.length > 0);
    });

    it('clears session tokens and notifies subscribers on logout', async () => {
      await authService.login({ email: 'test@campus.edu', password: 'Password123!' });
      assert.strictEqual(authService.isAuthenticated(), true);

      await authService.logout();
      assert.strictEqual(authService.isAuthenticated(), false);
      assert.strictEqual(authService.getCurrentUser(), null);
    });
  });

  // =========================================================
  // 2. Admin Review Console & Moderation Tests
  // =========================================================
  describe('Phase 1.2: Admin Dashboard & Review Console', () => {
    it('fetches verification queue items and calculates summary', async () => {
      const queue = await adminService.fetchVerifications();
      assert.ok(Array.isArray(queue));
      assert.ok(queue.length > 0, 'Verification queue should contain initial items');

      const summary = await adminService.fetchSummary();
      assert.strictEqual(typeof summary.pendingVerificationsCount, 'number');
      assert.strictEqual(typeof summary.verifiedStudentsCount, 'number');
      assert.strictEqual(typeof summary.openReportsCount, 'number');
    });

    it('approves a pending student ID verification and logs an audit entry', async () => {
      const queue = await adminService.fetchVerifications();
      const pendingItem = queue.find((v) => v.status === 'PENDING_APPROVAL');
      assert.ok(pendingItem, 'Expected at least one pending verification');

      const approved = await adminService.approveVerification(pendingItem.id);
      assert.strictEqual(approved, true);

      const updatedQueue = await adminService.fetchVerifications();
      const updatedItem = updatedQueue.find((v) => v.id === pendingItem.id);
      assert.strictEqual(updatedItem?.status, 'APPROVED');

      const logs = await adminService.fetchAuditLogs();
      const latestLog = logs[0];
      assert.ok(latestLog);
      assert.strictEqual(latestLog.action, 'VERIFICATION_APPROVED');
      assert.ok(latestLog.targetName.includes(pendingItem.studentName));
    });

    it('rejects a student ID verification with preset reason and logs reason', async () => {
      const queue = await adminService.fetchVerifications();
      const targetItem = queue.find((v) => v.status === 'PENDING_APPROVAL') || queue[0];
      assert.ok(targetItem);

      const reason = 'Student ID card has expired';
      const rejected = await adminService.rejectVerification(targetItem.id, reason);
      assert.strictEqual(rejected, true);

      const logs = await adminService.fetchAuditLogs();
      const latestLog = logs[0];
      assert.strictEqual(latestLog.action, 'VERIFICATION_REJECTED');
      assert.ok(latestLog.notes?.includes(reason));
    });

    it('manages student directory status (suspension & reinstatement)', async () => {
      const students = await adminService.fetchStudents();
      assert.ok(students.length > 0);
      const student = students[0];

      // Suspend student
      const suspended = await adminService.updateStudentStatus(student.id, 'SUSPENDED', 'Policy violation');
      assert.strictEqual(suspended, true);

      let updatedStudents = await adminService.fetchStudents();
      let updatedStudent = updatedStudents.find((s) => s.id === student.id);
      assert.strictEqual(updatedStudent?.status, 'SUSPENDED');

      // Reinstate student
      const reinstated = await adminService.updateStudentStatus(student.id, 'APPROVED', 'Reinstatement approved');
      assert.strictEqual(reinstated, true);

      updatedStudents = await adminService.fetchStudents();
      updatedStudent = updatedStudents.find((s) => s.id === student.id);
      assert.strictEqual(updatedStudent?.status, 'APPROVED');
    });

    it('resolves moderation reports with appropriate actions', async () => {
      const reports = await adminService.fetchReports();
      const openReport = reports.find((r) => r.status === 'OPEN');
      assert.ok(openReport, 'Expected an open moderation report');

      const resolved = await adminService.resolveReport(openReport.id, 'REMOVE_LISTING', 'Listing removed for safety violation');
      assert.strictEqual(resolved, true);

      const updatedReports = await adminService.fetchReports();
      const updatedReport = updatedReports.find((r) => r.id === openReport.id);
      assert.strictEqual(updatedReport?.status, 'RESOLVED');

      const logs = await adminService.fetchAuditLogs();
      assert.ok(logs[0].action.includes('REMOVE_LISTING'));
    });
  });

  // =========================================================
  // 3. Real-Time Chat & Safe Meetup Spots Tests
  // =========================================================
  describe('Phase 1.3: Real-Time Chat Engine & Safety Spots', () => {
    it('provides verified campus safe exchange zones', () => {
      assert.ok(Array.isArray(CAMPUS_MEETUP_SPOTS));
      assert.strictEqual(CAMPUS_MEETUP_SPOTS.length, 4);

      const gate1 = CAMPUS_MEETUP_SPOTS.find((s) => s.id === 'spot-gate1');
      assert.ok(gate1);
      assert.strictEqual(gate1.name, 'Campus Gate 1 Security Checkpoint');
      assert.ok(gate1.safetyRating.includes('Highest Security'));
    });

    it('sends outgoing message and notifies subscribers', async () => {
      let receivedMsgText = '';
      const unsubscribe = chatService.onMessage((msg) => {
        receivedMsgText = msg.text;
      });

      const message = await chatService.sendMessage('conv-test', {
        text: 'Hello, is this textbook still available?',
      });

      assert.strictEqual(message.in, false);
      assert.strictEqual(message.text, 'Hello, is this textbook still available?');
      assert.strictEqual(receivedMsgText, 'Hello, is this textbook still available?');

      unsubscribe();
    });

    it('formats safe campus meetup proposals properly with location details', async () => {
      const librarySpot = CAMPUS_MEETUP_SPOTS[0];
      const message = await chatService.sendMessage('conv-test', {
        text: `Proposed Safe Campus Exchange: ${librarySpot.name}`,
        meetupDetails: librarySpot,
      });

      assert.strictEqual(message.isMeetupProposal, true);
      assert.strictEqual(message.meetupDetails?.id, librarySpot.id);
      assert.strictEqual(message.meetupDetails?.name, librarySpot.name);
    });
  });

  // =========================================================
  // 4. In-App Notification System Tests
  // =========================================================
  describe('Phase 1.3: In-App Notification Drawer', () => {
    it('fetches notifications and correctly reports unread count', async () => {
      const notifs = await notificationService.fetchNotifications();
      assert.ok(Array.isArray(notifs));
      const unreadCount = notificationService.getUnreadCount();
      assert.strictEqual(typeof unreadCount, 'number');
    });

    it('pushes a new notification and increments unread count', async () => {
      const initialCount = notificationService.getUnreadCount();

      const newNotif = await notificationService.pushNotification({
        type: 'CHAT',
        title: 'New Student Message',
        message: 'Are you available to meet near Gate 1 today?',
      });

      assert.strictEqual(newNotif.read, false);
      assert.strictEqual(notificationService.getUnreadCount(), initialCount + 1);
    });

    it('marks a single notification as read', async () => {
      const notifs = notificationService.getNotifications();
      const unreadNotif = notifs.find((n) => !n.read);
      assert.ok(unreadNotif);

      const beforeCount = notificationService.getUnreadCount();
      await notificationService.markAsRead(unreadNotif.id);

      assert.strictEqual(notificationService.getUnreadCount(), beforeCount - 1);
    });

    it('marks all notifications as read', async () => {
      await notificationService.pushNotification({
        type: 'CAMPUS_ALERT',
        title: 'Campus Weather Alert',
        message: 'Severe rain expected, prefer indoor study lounges.',
      });

      assert.ok(notificationService.getUnreadCount() > 0);

      await notificationService.markAllAsRead();
      assert.strictEqual(notificationService.getUnreadCount(), 0);
    });
  });

  // =========================================================
  // 5. Complete Student Lifecycle Journey Test
  // =========================================================
  describe('Phase 1.4: Complete Student Onboarding & Marketplace Lifecycle', () => {
    it('executes full student journey: Register -> OTP -> ID Upload -> Admin Approval -> Notification -> Chat Meetup', async () => {
      // Step 1: Register
      const registered = await authService.register({
        fullName: 'Kalkidan Assefa',
        email: 'kalkidan.a@mu.edu.et',
        password: 'Password123!',
        studentId: 'UGR/5512/15',
        department: 'Architecture & Urban Planning',
        academicYear: '3rd Year',
      });
      assert.ok(registered);
      assert.strictEqual(registered.user.status, 'PENDING_EMAIL');
      assert.strictEqual(authService.getCurrentUser()?.status, 'PENDING_EMAIL');

      // Step 2: Email OTP Verification
      const emailVerified = await authService.verifyEmail({
        email: 'kalkidan.a@mu.edu.et',
        otp: '482910',
      });
      assert.ok(emailVerified);
      assert.strictEqual(emailVerified.user.status, 'PENDING_UPLOAD');
      assert.strictEqual(authService.getCurrentUser()?.status, 'PENDING_UPLOAD');

      // Step 3: Student ID Card Upload
      const uploadResult = await authService.uploadStudentId({
        idDocumentDataUrl:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        fileName: 'student_id_kalkidan.png',
      });
      assert.ok(uploadResult);
      assert.strictEqual(uploadResult.status, 'PENDING_APPROVAL');
      assert.strictEqual(uploadResult.badge, 'Pending Review');
      assert.strictEqual(authService.getCurrentUser()?.status, 'PENDING_APPROVAL');

      // Step 4: Admin Queue Review & Approval
      const queue = await adminService.fetchVerifications();
      assert.ok(queue.length > 0);
      const pendingItem = queue[0];
      const approveSuccess = await adminService.approveVerification(pendingItem.id);
      assert.strictEqual(approveSuccess, true);

      // Verify audit log
      const logs = await adminService.fetchAuditLogs();
      assert.ok(logs.some((l) => l.action === 'VERIFICATION_APPROVED'));

      // Step 5: Deliver Notification to Student
      const notif = await notificationService.pushNotification({
        type: 'VERIFICATION',
        title: 'Student ID Verification Approved',
        message: 'Your official Mekelle University credentials have been confirmed. 0% student fee tier unlocked!',
        data: { verificationStatus: 'APPROVED' },
      });
      assert.strictEqual(notif.type, 'VERIFICATION');
      assert.strictEqual(notif.read, false);
      assert.ok(notificationService.getUnreadCount() > 0);

      // Step 6: Safe Campus Exchange Proposal in Chat
      const safeSpot = CAMPUS_MEETUP_SPOTS.find((s) => s.id === 'spot-lib') || CAMPUS_MEETUP_SPOTS[0];
      const chatMessage = await chatService.sendMessage('conv-journey-test', {
        text: `Proposed Safe Campus Exchange: ${safeSpot.name}`,
        meetupDetails: safeSpot,
      });
      assert.strictEqual(chatMessage.isMeetupProposal, true);
      assert.strictEqual(chatMessage.meetupDetails?.id, safeSpot.id);
      assert.strictEqual(chatMessage.in, false);
    });
  });
});
