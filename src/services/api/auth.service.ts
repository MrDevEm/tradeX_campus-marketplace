import { isApiConfigured } from '../../config/env';
import type {
  AuthSession,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  UploadStudentIdPayload,
  VerificationStatus,
  VerifyEmailPayload,
} from '../../types/marketplace';
import { apiRequest, getStoredAuthToken, getStoredAuthUser, setStoredAuthToken, setStoredAuthUser } from './client';
import { API_ENDPOINTS } from './endpoints';

type AuthListener = (user: AuthUser | null) => void;
const listeners = new Set<AuthListener>();

function notifyAuthListeners(user: AuthUser | null): void {
  listeners.forEach((listener) => {
    try {
      listener(user);
    } catch {
      // Ignore subscriber errors.
    }
  });
}

export const authService = {
  subscribe(listener: AuthListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getCurrentUser(): AuthUser | null {
    return getStoredAuthUser();
  },

  isAuthenticated(): boolean {
    return Boolean(getStoredAuthToken() || getStoredAuthUser());
  },

  setCurrentUser(user: AuthUser | null): void {
    setStoredAuthUser(user);
    notifyAuthListeners(user);
  },

  async login(payload: LoginPayload): Promise<AuthSession | null> {
    if (!isApiConfigured()) {
      // Offline fallback: simulate verified student session for UI demo
      const fallbackUser: AuthUser = {
        id: 'u-demo-1',
        fullName: 'Dawit M.',
        email: payload.email || 'dawit.m@university.edu',
        studentId: 'UGR/1402/14',
        department: 'Software Engineering',
        academicYear: '4th Year',
        verified: true,
        status: 'APPROVED',
        role: 'STUDENT',
        idDocumentUploaded: true,
      };
      const session: AuthSession = {
        token: 'mock-jwt-token-dawit',
        user: fallbackUser,
      };
      setStoredAuthToken(session.token);
      setStoredAuthUser(session.user);
      notifyAuthListeners(session.user);
      return session;
    }

    const session = await apiRequest<AuthSession>(API_ENDPOINTS.auth.login, {
      method: 'POST',
      body: payload,
    });
    if (session?.token) {
      setStoredAuthToken(session.token);
    }
    if (session?.user) {
      setStoredAuthUser(session.user);
      notifyAuthListeners(session.user);
    }
    return session;
  },

  async register(payload: RegisterPayload): Promise<AuthSession | null> {
    if (!isApiConfigured()) {
      // Offline fallback: create student in pending email OTP state
      const fallbackUser: AuthUser = {
        id: 'u-' + Date.now(),
        fullName: payload.fullName,
        email: payload.email,
        studentId: payload.studentId,
        department: payload.department,
        academicYear: payload.academicYear,
        verified: false,
        status: 'PENDING_EMAIL',
        role: 'STUDENT',
        idDocumentUploaded: false,
      };
      const session: AuthSession = {
        token: 'pending-token-' + Date.now(),
        user: fallbackUser,
      };
      setStoredAuthUser(fallbackUser);
      notifyAuthListeners(fallbackUser);
      return session;
    }

    const session = await apiRequest<AuthSession>(API_ENDPOINTS.auth.register, {
      method: 'POST',
      body: payload,
    });
    if (session?.token) {
      setStoredAuthToken(session.token);
    }
    if (session?.user) {
      setStoredAuthUser(session.user);
      notifyAuthListeners(session.user);
    }
    return session;
  },

  async verifyEmail(payload: VerifyEmailPayload): Promise<AuthSession | null> {
    if (!isApiConfigured()) {
      const current = getStoredAuthUser();
      const updatedUser: AuthUser = {
        id: current?.id || 'u-demo-1',
        fullName: current?.fullName || 'Sara Bekele',
        email: payload.email,
        studentId: current?.studentId || 'UGR/1402/14',
        department: current?.department || 'Software Engineering',
        academicYear: current?.academicYear || '3rd Year',
        verified: false,
        status: 'PENDING_UPLOAD',
        role: 'STUDENT',
        idDocumentUploaded: false,
      };
      const session: AuthSession = {
        token: 'token-' + Date.now(),
        user: updatedUser,
      };
      setStoredAuthToken(session.token);
      setStoredAuthUser(updatedUser);
      notifyAuthListeners(updatedUser);
      return session;
    }

    const session = await apiRequest<AuthSession>(API_ENDPOINTS.auth.verifyEmail, {
      method: 'POST',
      body: payload,
    });
    if (session?.token) setStoredAuthToken(session.token);
    if (session?.user) {
      setStoredAuthUser(session.user);
      notifyAuthListeners(session.user);
    }
    return session;
  },

  async resendOtp(email: string): Promise<{ success: boolean; message: string }> {
    if (!isApiConfigured()) {
      return { success: true, message: 'Verification code resent successfully to ' + email };
    }
    return apiRequest<{ success: boolean; message: string }>(API_ENDPOINTS.auth.resendOtp, {
      method: 'POST',
      body: { email },
    });
  },

  async uploadStudentId(payload: UploadStudentIdPayload): Promise<VerificationStatus | null> {
    if (!isApiConfigured()) {
      const current = getStoredAuthUser();
      const updatedUser: AuthUser = {
        id: current?.id || 'u-demo-1',
        fullName: current?.fullName || 'Sara Bekele',
        email: current?.email || 'sara.b@campus.edu',
        studentId: current?.studentId || 'UGR/1402/14',
        department: current?.department || 'Software Engineering',
        academicYear: current?.academicYear || '3rd Year',
        verified: false,
        status: 'PENDING_APPROVAL',
        role: 'STUDENT',
        idDocumentUploaded: true,
      };
      setStoredAuthUser(updatedUser);
      notifyAuthListeners(updatedUser);
      return {
        status: 'PENDING_APPROVAL',
        badge: 'Pending Review',
        emailConfirmed: true,
        idDocumentUploaded: true,
        feeTier: '0% Student Tier',
      };
    }

    return apiRequest<VerificationStatus>(API_ENDPOINTS.auth.uploadStudentId, {
      method: 'POST',
      body: payload,
    });
  },

  async getVerificationStatus(): Promise<VerificationStatus | null> {
    if (!isApiConfigured()) {
      const current = getStoredAuthUser();
      const status = current?.status || 'APPROVED';
      const isApproved = status === 'APPROVED';
      return {
        status,
        badge: isApproved ? 'Verified Student' : status === 'PENDING_APPROVAL' ? 'Pending Review' : 'Action Required',
        emailConfirmed: status !== 'PENDING_EMAIL',
        idDocumentUploaded: Boolean(current?.idDocumentUploaded),
        rejectionReason: current?.rejectionReason,
        feeTier: '0% Student Tier',
      };
    }
    return apiRequest<VerificationStatus>(API_ENDPOINTS.auth.verificationStatus);
  },

  async logout(): Promise<void> {
    try {
      if (isApiConfigured()) {
        await apiRequest<void>(API_ENDPOINTS.auth.logout, { method: 'POST' });
      }
    } finally {
      setStoredAuthToken(null);
      setStoredAuthUser(null);
      notifyAuthListeners(null);
    }
  },
};
