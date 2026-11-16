import { isApiConfigured } from '../../config/env';
import type { ChatMessage, Conversation } from '../../types/marketplace';
import { apiRequest } from './client';
import { API_ENDPOINTS } from './endpoints';

export const messagingService = {
  async fetchConversations(): Promise<Conversation[] | null> {
    if (!isApiConfigured()) return null;
    return apiRequest<Conversation[]>(API_ENDPOINTS.messaging.conversations);
  },

  async sendMessage(
    conversationId: string,
    payload: { text: string; img?: string }
  ): Promise<ChatMessage | null> {
    if (!isApiConfigured()) return null;
    return apiRequest<ChatMessage>(API_ENDPOINTS.messaging.messages(conversationId), {
      method: 'POST',
      body: payload,
    });
  },

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    if (!isApiConfigured()) return;
    await apiRequest<void>(API_ENDPOINTS.messaging.deleteMessage(conversationId, messageId), {
      method: 'DELETE',
    });
  },

  async clearConversation(conversationId: string): Promise<void> {
    if (!isApiConfigured()) return;
    await apiRequest<void>(API_ENDPOINTS.messaging.messages(conversationId), {
      method: 'DELETE',
    });
  },

  async deleteConversation(conversationId: string): Promise<void> {
    if (!isApiConfigured()) return;
    await apiRequest<void>(API_ENDPOINTS.messaging.conversationDetail(conversationId), {
      method: 'DELETE',
    });
  },

  async togglePinConversation(conversationId: string, pinned: boolean): Promise<void> {
    if (!isApiConfigured()) return;
    await apiRequest<void>(API_ENDPOINTS.messaging.pinConversation(conversationId), {
      method: 'PATCH',
      body: { pinned },
    });
  },

  async reportConversation(conversationId: string, reason = 'campus-safety-report'): Promise<void> {
    if (!isApiConfigured()) return;
    await apiRequest<void>(API_ENDPOINTS.messaging.reportConversation(conversationId), {
      method: 'POST',
      body: { reason },
    });
  },
};
