/**
 * Configurable REST API endpoint contracts for the tradeX frontend.
 * Live requests are only issued when VITE_API_BASE_URL is configured;
 * actual backend routes should be aligned with the server implementation.
 */
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    verifyEmail: '/auth/verify-email',
    resendOtp: '/auth/resend-otp',
    uploadStudentId: '/verification/upload-id',
    logout: '/auth/logout',
    verificationStatus: '/auth/verification-status',
  },
  listings: {
    list: '/listings',
    detail: (id: string) => `/listings/${encodeURIComponent(id)}`,
    create: '/listings',
    toggleSave: (id: string) => `/listings/${encodeURIComponent(id)}/save`,
  },
  messaging: {
    conversations: '/conversations',
    conversationDetail: (id: string) => `/conversations/${encodeURIComponent(id)}`,
    messages: (conversationId: string) =>
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
    deleteMessage: (conversationId: string, messageId: string) =>
      `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
    pinConversation: (conversationId: string) =>
      `/conversations/${encodeURIComponent(conversationId)}/pin`,
    reportConversation: (conversationId: string) =>
      `/conversations/${encodeURIComponent(conversationId)}/report`,
  },
  dashboard: {
    summary: '/dashboard/summary',
    myListings: '/dashboard/listings',
  },
} as const;
