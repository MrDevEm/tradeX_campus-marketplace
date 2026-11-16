import { isApiConfigured } from '../../config/env';
import type { AuthSession, LoginPayload, RegisterPayload, VerificationStatus } from '../../types/marketplace';
import { apiRequest, setStoredAuthToken } from './client';
import { API_ENDPOINTS } from './endpoints';

export const authService = {
  async login(payload: LoginPayload): Promise<AuthSession | null> {
    if (!isApiConfigured()) return null;
    const session = await apiRequest<AuthSession>(API_ENDPOINTS.auth.login, {
      method: 'POST',
      body: payload,
    });
    if (session?.token) {
      setStoredAuthToken(session.token);
    }
    return session;
  },

  async register(payload: RegisterPayload): Promise<AuthSession | null> {
    if (!isApiConfigured()) return null;
    const session = await apiRequest<AuthSession>(API_ENDPOINTS.auth.register, {
      method: 'POST',
      body: payload,
    });
    if (session?.token) {
      setStoredAuthToken(session.token);
    }
    return session;
  },

  async getVerificationStatus(): Promise<VerificationStatus | null> {
    if (!isApiConfigured()) return null;
    return apiRequest<VerificationStatus>(API_ENDPOINTS.auth.verificationStatus);
  },

  async logout(): Promise<void> {
    try {
      if (isApiConfigured()) {
        await apiRequest<void>(API_ENDPOINTS.auth.logout, { method: 'POST' });
      }
    } finally {
      setStoredAuthToken(null);
    }
  },
};
