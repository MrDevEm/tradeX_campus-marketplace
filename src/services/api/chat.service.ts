import { isApiConfigured } from '../../config/env.ts';
import type { CampusMeetupSpot, ChatMessage, Conversation } from '../../types/marketplace.ts';
import { apiRequest } from './client.ts';
import { API_ENDPOINTS } from './endpoints.ts';
import { notificationService } from './notification.service.ts';

export const CAMPUS_MEETUP_SPOTS: CampusMeetupSpot[] = [
  {
    id: 'spot-lib',
    name: 'Main Library Plaza (North Entrance)',
    description: 'Well-lit central campus area with security presence and CCTV coverage.',
    safetyRating: 'Verified Safe Zone • High Foot Traffic',
    landmark: 'Opposite Academic Quadrangle',
  },
  {
    id: 'spot-union',
    name: 'Student Union Lounge (Ground Floor)',
    description: 'Open indoor student area with daylight hours and campus Wi-Fi.',
    safetyRating: 'Verified Safe Zone • Daytime Access',
    landmark: 'Ground Floor Atrium',
  },
  {
    id: 'spot-gate1',
    name: 'Campus Gate 1 Security Checkpoint',
    description: 'University security staff present 24/7; safest exchange spot for high-value items.',
    safetyRating: 'Highest Security • 24/7 Monitored',
    landmark: 'Main Campus Guard Pavilion',
  },
  {
    id: 'spot-cafe',
    name: 'Central Campus Cafeteria Entrance',
    description: 'Active student gathering point during lunchtime and late afternoon.',
    safetyRating: 'Verified Safe Zone • Peak Hours',
    landmark: 'Near Student Services Building',
  },
];

type MessageListener = (message: ChatMessage, conversationId: string) => void;
type TypingListener = (data: { conversationId: string; sender: string; isTyping: boolean }) => void;
type ConnectionListener = (status: 'connected' | 'connecting' | 'disconnected') => void;

const messageListeners = new Set<MessageListener>();
const typingListeners = new Set<TypingListener>();
const connectionListeners = new Set<ConnectionListener>();

let connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'connected';
let socket: WebSocket | null = null;
let reconnectTimer: number | null = null;

function notifyConnectionChange(status: 'connected' | 'connecting' | 'disconnected'): void {
  connectionStatus = status;
  connectionListeners.forEach((l) => l(status));
}

function getFormattedTime(): string {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function getWsUrl(): string {
  if (isApiConfigured()) {
    const base = (typeof window !== 'undefined' && (window as unknown as { __API_BASE__?: string }).__API_BASE__) || 'http://localhost:3001/api';
    return base.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws';
  }
  if (typeof window !== 'undefined' && window.location) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  }
  return 'ws://localhost:3001/ws';
}

export const chatService = {
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    return connectionStatus;
  },

  connectWebSocket(token?: string): void {
    if (typeof WebSocket === 'undefined') return;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    notifyConnectionChange('connecting');
    const wsUrl = getWsUrl() + (token ? `?token=${encodeURIComponent(token)}` : '');

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        notifyConnectionChange('connected');
        if (token) {
          socket?.send(JSON.stringify({ type: 'auth', token }));
        }
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { event: eventName, data } = payload;

          if (eventName === 'new-message' && data) {
            const incoming: ChatMessage = {
              id: data.id || 'msg-' + Date.now(),
              in: true,
              time: getFormattedTime(),
              text: data.text || '',
              isMeetupProposal: Boolean(data.isMeetupProposal),
              meetupDetails: data.meetupSpot || undefined,
            };
            messageListeners.forEach((l) => l(incoming, data.conversationId));
          } else if (eventName === 'typing' && data) {
            typingListeners.forEach((l) =>
              l({
                conversationId: data.conversationId,
                sender: data.sender || 'Student',
                isTyping: Boolean(data.isTyping),
              })
            );
          } else if (eventName === 'new-notification' && data) {
            notificationService.pushNotification({
              type: data.type || 'CHAT',
              title: data.title || 'Campus Alert',
              message: data.message || '',
              data: { entityId: data.entityId },
            });
          }
        } catch (e) {
          console.warn('[ChatService] Failed to parse WebSocket message:', e);
        }
      };

      socket.onclose = () => {
        notifyConnectionChange('disconnected');
        socket = null;
        if (isApiConfigured() && !reconnectTimer && typeof window !== 'undefined') {
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            this.connectWebSocket(token);
          }, 3000);
        }
      };

      socket.onerror = () => {
        notifyConnectionChange('disconnected');
      };
    } catch {
      notifyConnectionChange('disconnected');
    }
  },

  sendTyping(conversationId: string, isTyping: boolean): void {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'typing', conversationId, isTyping }));
    }
  },

  subscribeConversation(conversationId: string): void {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'subscribe', channel: `private-chat-${conversationId}` }));
    }
  },

  onMessage(listener: MessageListener): () => void {
    messageListeners.add(listener);
    return () => messageListeners.delete(listener);
  },

  onTyping(listener: TypingListener): () => void {
    typingListeners.add(listener);
    return () => typingListeners.delete(listener);
  },

  onConnectionChange(listener: ConnectionListener): () => void {
    connectionListeners.add(listener);
    listener(connectionStatus);
    return () => connectionListeners.delete(listener);
  },

  async sendMessage(
    conversationId: string,
    payload: {
      text: string;
      img?: string;
      meetupDetails?: CampusMeetupSpot;
    }
  ): Promise<ChatMessage> {
    const newMessage: ChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      in: false, // Outgoing from current student
      time: getFormattedTime(),
      text: payload.text,
      img: payload.img,
      isMeetupProposal: Boolean(payload.meetupDetails),
      meetupDetails: payload.meetupDetails,
    };

    if (isApiConfigured()) {
      await apiRequest<ChatMessage>(API_ENDPOINTS.messaging.messages(conversationId), {
        method: 'POST',
        body: payload,
      }).catch((e) => console.warn('[ChatService] Server send failed, using local message:', e));
    }

    // Broadcast outgoing message to active UI
    messageListeners.forEach((l) => l(newMessage, conversationId));

    // Simulate realistic peer reaction if in offline demo mode
    if (!isApiConfigured()) {
      this.scheduleSimulatedPeerResponse(conversationId, payload);
    }

    return newMessage;
  },

  scheduleSimulatedPeerResponse(
    conversationId: string,
    outgoing: { text: string; meetupDetails?: CampusMeetupSpot }
  ): void {
    const sellerName = 'Dawit M.';

    // Show typing indicator after 700ms
    window.setTimeout(() => {
      typingListeners.forEach((l) =>
        l({
          conversationId,
          sender: sellerName,
          isTyping: true,
        })
      );
    }, 700);

    // Deliver response after 2200ms
    window.setTimeout(async () => {
      typingListeners.forEach((l) =>
        l({
          conversationId,
          sender: sellerName,
          isTyping: false,
        })
      );

      let replyText = 'Sounds good to me! Let me know when you arrive.';
      if (outgoing.meetupDetails) {
        replyText = `Perfect! Meeting at ${outgoing.meetupDetails.name} is super convenient for me. I will see you there!`;
      } else if (outgoing.text.toLowerCase().includes('available')) {
        replyText = 'Yes, it is still available! Are you free to meet on campus today?';
      } else if (outgoing.text.toLowerCase().includes('price') || outgoing.text.toLowerCase().includes('discount')) {
        replyText = 'The price is slightly negotiable for students. Let us meet in person to inspect it!';
      }

      const incomingMessage: ChatMessage = {
        id: 'msg-reply-' + Date.now(),
        in: true, // Incoming from seller
        time: getFormattedTime(),
        text: replyText,
      };

      messageListeners.forEach((l) => l(incomingMessage, conversationId));

      // Trigger an in-app notification
      await notificationService.pushNotification({
        type: 'CHAT',
        title: `Message from ${sellerName}`,
        message: replyText,
        data: {
          conversationId,
        },
      });
    }, 2400);
  },
};
