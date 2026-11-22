import { isApiConfigured } from '../../config/env.ts';
import type {
  AdminStudent,
  AdminSummary,
  AuditLogEntry,
  ModerationReport,
  UserStatus,
  VerificationQueueItem,
} from '../../types/marketplace.ts';
import { apiRequest } from './client.ts';
import { API_ENDPOINTS } from './endpoints.ts';

// Initial realistic administrative review data for offline operation
const INITIAL_VERIFICATIONS: VerificationQueueItem[] = [
  {
    id: 'vq-1',
    userId: 'u-sara-1',
    studentName: 'Sara Bekele',
    studentId: 'UGR/1402/14',
    department: 'Software Engineering',
    academicYear: '3rd Year',
    email: 'sara.b@campus.edu',
    idDocumentUrl: '/images/products/laptop.jpg', // Sample placeholder image for verification document
    submittedAt: 'Today, 14:22',
    status: 'PENDING_APPROVAL',
  },
  {
    id: 'vq-2',
    userId: 'u-natnael-2',
    studentName: 'Natnael Tesfay',
    studentId: 'UGR/2911/15',
    department: 'Electrical & Computer Engineering',
    academicYear: '2nd Year',
    email: 'natnael.t@campus.edu',
    idDocumentUrl: '/images/products/book.png',
    submittedAt: 'Today, 11:45',
    status: 'PENDING_APPROVAL',
  },
  {
    id: 'vq-3',
    userId: 'u-eden-3',
    studentName: 'Eden Haile',
    studentId: 'UGR/0833/13',
    department: 'Medicine & Health Sciences',
    academicYear: '4th Year',
    email: 'eden.h@campus.edu',
    idDocumentUrl: '/images/products/shoes.jpg',
    submittedAt: 'Yesterday, 17:10',
    status: 'PENDING_APPROVAL',
  },
];

const INITIAL_STUDENTS: AdminStudent[] = [
  {
    id: 'u-dawit-1',
    fullName: 'Dawit M.',
    studentId: 'UGR/1402/14',
    department: 'Software Engineering',
    academicYear: '4th Year',
    email: 'dawit.m@university.edu',
    status: 'APPROVED',
    role: 'STUDENT',
    joinedAt: 'Nov 02, 2026',
    activeListingsCount: 3,
    trustScore: 100,
  },
  {
    id: 'u-sara-1',
    fullName: 'Sara Bekele',
    studentId: 'UGR/1402/14',
    department: 'Software Engineering',
    academicYear: '3rd Year',
    email: 'sara.b@campus.edu',
    status: 'PENDING_APPROVAL',
    role: 'STUDENT',
    joinedAt: 'Today',
    activeListingsCount: 0,
    trustScore: 100,
  },
  {
    id: 'u-natnael-2',
    fullName: 'Natnael Tesfay',
    studentId: 'UGR/2911/15',
    department: 'Electrical & Computer Engineering',
    academicYear: '2nd Year',
    email: 'natnael.t@campus.edu',
    status: 'PENDING_APPROVAL',
    role: 'STUDENT',
    joinedAt: 'Today',
    activeListingsCount: 0,
    trustScore: 100,
  },
  {
    id: 'u-kal-4',
    fullName: 'Kalkidan Assefa',
    studentId: 'UGR/8821/14',
    department: 'Architecture & Urban Planning',
    academicYear: '3rd Year',
    email: 'kal.a@campus.edu',
    status: 'APPROVED',
    role: 'STUDENT',
    joinedAt: 'Nov 05, 2026',
    activeListingsCount: 2,
    trustScore: 98,
  },
  {
    id: 'u-yared-5',
    fullName: 'Yared Berhe',
    studentId: 'UGR/3309/12',
    department: 'Mechanical Engineering',
    academicYear: '5th Year',
    email: 'yared.b@campus.edu',
    status: 'SUSPENDED',
    role: 'STUDENT',
    joinedAt: 'Oct 28, 2026',
    activeListingsCount: 0,
    trustScore: 45,
  },
];

const INITIAL_REPORTS: ModerationReport[] = [
  {
    id: 'rep-1',
    reporterName: 'Dawit M.',
    reporterId: 'u-dawit-1',
    targetType: 'LISTING',
    targetId: 'item-2',
    targetTitle: 'Calculus 9th Edition Book (Duplicate)',
    reason: 'Suspicious duplicate listing with inflated price',
    details: 'Seller listed this exact textbook multiple times and refused to specify meeting on campus.',
    timestamp: 'Today, 13:10',
    status: 'OPEN',
  },
  {
    id: 'rep-2',
    reporterName: 'Kalkidan A.',
    reporterId: 'u-kal-4',
    targetType: 'USER',
    targetId: 'u-yared-5',
    targetTitle: 'User: Yared Berhe',
    reason: 'Non-campus meeting location request',
    details: 'User requested private meetups off-campus outside daylight hours.',
    timestamp: 'Yesterday, 19:40',
    status: 'OPEN',
  },
];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-1',
    timestamp: 'Today, 10:15',
    actorName: 'Campus Admin (You)',
    action: 'USER_VERIFIED',
    targetType: 'STUDENT',
    targetName: 'Kalkidan Assefa (UGR/8821/14)',
    notes: 'Student ID card matched university enrollment records.',
  },
  {
    id: 'aud-2',
    timestamp: 'Yesterday, 16:30',
    actorName: 'Campus Admin (You)',
    action: 'USER_SUSPENDED',
    targetType: 'STUDENT',
    targetName: 'Yared Berhe (UGR/3309/12)',
    notes: 'Multiple violations of campus safety standards.',
  },
];

let localVerifications = [...INITIAL_VERIFICATIONS];
let localStudents = [...INITIAL_STUDENTS];
let localReports = [...INITIAL_REPORTS];
let localAuditLogs = [...INITIAL_AUDIT_LOGS];

function getFormattedNow(): string {
  const d = new Date();
  return (
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0')
  );
}

export const adminService = {
  async fetchSummary(): Promise<AdminSummary> {
    if (!isApiConfigured()) {
      const pendingVerifs = localVerifications.filter(
        (v) => v.status === 'PENDING_APPROVAL'
      ).length;
      const openReps = localReports.filter((r) => r.status === 'OPEN').length;
      const verified = localStudents.filter(
        (s) => s.status === 'APPROVED'
      ).length;
      return {
        pendingVerificationsCount: pendingVerifs,
        openReportsCount: openReps,
        verifiedStudentsCount: verified,
        totalListingsCount: 18,
      };
    }
    return apiRequest<AdminSummary>(API_ENDPOINTS.admin.summary);
  },

  async fetchVerifications(): Promise<VerificationQueueItem[]> {
    if (!isApiConfigured()) {
      return [...localVerifications];
    }
    return apiRequest<VerificationQueueItem[]>(
      API_ENDPOINTS.admin.verifications
    );
  },

  async approveVerification(id: string): Promise<boolean> {
    if (!isApiConfigured()) {
      const item = localVerifications.find((v) => v.id === id);
      if (!item) return false;
      item.status = 'APPROVED';

      const student = localStudents.find((s) => s.id === item.userId);
      if (student) student.status = 'APPROVED';

      localAuditLogs.unshift({
        id: 'aud-' + Date.now(),
        timestamp: 'Today, ' + getFormattedNow(),
        actorName: 'Campus Admin (You)',
        action: 'VERIFICATION_APPROVED',
        targetType: 'STUDENT',
        targetName: `${item.studentName} (${item.studentId})`,
        notes: 'Official student ID verified by campus reviewer.',
      });
      return true;
    }

    await apiRequest<void>(API_ENDPOINTS.admin.approveVerification(id), {
      method: 'POST',
    });
    return true;
  },

  async rejectVerification(id: string, reason: string): Promise<boolean> {
    if (!isApiConfigured()) {
      const item = localVerifications.find((v) => v.id === id);
      if (!item) return false;
      item.status = 'REJECTED';
      item.rejectionReason = reason;

      const student = localStudents.find((s) => s.id === item.userId);
      if (student) {
        student.status = 'REJECTED';
      }

      localAuditLogs.unshift({
        id: 'aud-' + Date.now(),
        timestamp: 'Today, ' + getFormattedNow(),
        actorName: 'Campus Admin (You)',
        action: 'VERIFICATION_REJECTED',
        targetType: 'STUDENT',
        targetName: `${item.studentName} (${item.studentId})`,
        notes: `Reason: ${reason}`,
      });
      return true;
    }

    await apiRequest<void>(API_ENDPOINTS.admin.rejectVerification(id), {
      method: 'POST',
      body: { reason },
    });
    return true;
  },

  async fetchStudents(): Promise<AdminStudent[]> {
    if (!isApiConfigured()) {
      return [...localStudents];
    }
    return apiRequest<AdminStudent[]>(API_ENDPOINTS.admin.students);
  },

  async updateStudentStatus(
    id: string,
    status: UserStatus,
    reason = 'Administrative moderation action'
  ): Promise<boolean> {
    if (!isApiConfigured()) {
      const student = localStudents.find((s) => s.id === id);
      if (!student) return false;
      const prevStatus = student.status;
      student.status = status;

      localAuditLogs.unshift({
        id: 'aud-' + Date.now(),
        timestamp: 'Today, ' + getFormattedNow(),
        actorName: 'Campus Admin (You)',
        action: status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_STATUS_UPDATED',
        targetType: 'STUDENT',
        targetName: `${student.fullName} (${student.studentId})`,
        notes: `${prevStatus} → ${status}. Reason: ${reason}`,
      });
      return true;
    }

    await apiRequest<void>(API_ENDPOINTS.admin.updateStudentStatus(id), {
      method: 'PATCH',
      body: { status, reason },
    });
    return true;
  },

  async fetchReports(): Promise<ModerationReport[]> {
    if (!isApiConfigured()) {
      return [...localReports];
    }
    return apiRequest<ModerationReport[]>(API_ENDPOINTS.admin.reports);
  },

  async resolveReport(
    id: string,
    action: 'REMOVE_LISTING' | 'WARN_USER' | 'SUSPEND_USER' | 'DISMISS',
    notes: string
  ): Promise<boolean> {
    if (!isApiConfigured()) {
      const rep = localReports.find((r) => r.id === id);
      if (!rep) return false;
      rep.status = action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED';
      rep.resolutionNote = `${action}: ${notes}`;

      localAuditLogs.unshift({
        id: 'aud-' + Date.now(),
        timestamp: 'Today, ' + getFormattedNow(),
        actorName: 'Campus Admin (You)',
        action: 'REPORT_' + action,
        targetType: rep.targetType,
        targetName: rep.targetTitle,
        notes: `Report resolved by reviewer. Details: ${notes}`,
      });
      return true;
    }

    await apiRequest<void>(API_ENDPOINTS.admin.resolveReport(id), {
      method: 'POST',
      body: { action, notes },
    });
    return true;
  },

  async fetchAuditLogs(): Promise<AuditLogEntry[]> {
    if (!isApiConfigured()) {
      return [...localAuditLogs];
    }
    return apiRequest<AuditLogEntry[]>(API_ENDPOINTS.admin.auditLogs);
  },

  async fetchAdmins(): Promise<Array<{ id: string; email: string; fullName: string; role: string; status: string; createdAt: string }>> {
    if (!isApiConfigured()) {
      const stored = localStorage.getItem('tradex_platform_admins');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // fallback
        }
      }
      return [
        {
          id: 'admin-seed-1',
          fullName: 'Campus Admin',
          email: 'admin@mu.edu.et',
          role: 'SUPERADMIN',
          status: 'APPROVED',
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return apiRequest(API_ENDPOINTS.admin.settingsAdmins);
  },

  async createAdmin(payload: { fullName: string; email: string; role: string; password: string }): Promise<any> {
    if (!isApiConfigured()) {
      const current = await this.fetchAdmins();
      const newAdmin = {
        id: 'admin-' + Date.now(),
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role,
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
      };
      current.unshift(newAdmin);
      localStorage.setItem('tradex_platform_admins', JSON.stringify(current));

      localAuditLogs.unshift({
        id: 'aud-' + Date.now(),
        timestamp: 'Today, ' + getFormattedNow(),
        actorName: 'Campus Admin (You)',
        action: 'ADMIN_PROVISIONED',
        targetType: 'USER',
        targetName: payload.email,
        notes: `Created staff admin account for ${payload.fullName} (${payload.role}).`,
      });
      return newAdmin;
    }
    return apiRequest(API_ENDPOINTS.admin.settingsAdmins, {
      method: 'POST',
      body: payload,
    });
  },

  async updateCredentials(payload: { email?: string; currentPassword?: string; newPassword?: string }): Promise<any> {
    if (!isApiConfigured()) {
      localAuditLogs.unshift({
        id: 'aud-' + Date.now(),
        timestamp: 'Today, ' + getFormattedNow(),
        actorName: 'Campus Admin (You)',
        action: 'STAFF_CREDENTIALS_UPDATED',
        targetType: 'USER',
        targetName: payload.email || 'admin@mu.edu.et',
        notes: 'Updated staff administrator email or password security credentials.',
      });
      return { success: true };
    }
    return apiRequest(API_ENDPOINTS.admin.settingsCredentials, {
      method: 'PATCH',
      body: payload,
    });
  },
};
