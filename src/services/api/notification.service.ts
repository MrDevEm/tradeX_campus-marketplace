import { isApiConfigured } from '../../config/env';
import type { CampusNotification, NotificationType } from '../../types/marketplace';
import { apiRequest } from './client';
import { API_ENDPOINTS } from './endpoints';

const NOTIFICATIONS_STORAGE_KEY = 'tradex_campus_notifications';

const INITIAL_NOTIFICATIONS: CampusNotification[] = [
  {
    id: 'notif-1',
    userId: 'u-demo-1',
    type: 'CHAT',
    title: 'New Message from Dawit M.',
    message: 'Can we meet at the Main Library Plaza around 3:30 PM?',
    timestamp: '5m ago',
    read: false,
    data: {
      conversationId: 'conv-1',
      listingId: 'item-1',
    },
  },
  {
    id: 'notif-2',
    userId: 'u-demo-1',
    type: 'VERIFICATION',
    title: 'Student ID Verification Approved',
    message: 'Your official AAU student credentials have been confirmed. 0% seller fee tier unlocked!',
    timestamp: '1h ago',
    read: false,
    data: {
      verificationStatus: 'APPROVED',
    },
  },
  {
    id: 'notif-3',
    userId: 'u-demo-1',
    type: 'LISTING_OFFER',
    title: 'Offer Received for TI-84 Plus',
    message: 'Kalkidan A. offered 4,000 ETB for your calculator.',
    timestamp: '3h ago',
    read: true,
    data: {
      listingId: 'item-3',
      conversationId: 'conv-2',
    },
  },
  {
    id: 'notif-4',
    userId: 'u-demo-1',
    type: 'CAMPUS_ALERT',
    title: 'Campus Safety Notice',
    message: 'Always complete peer marketplace transactions during daylight hours at designated campus security zones.',
    timestamp: '1d ago',
    read: true,
  },
];

type NotificationListener = (notifications: CampusNotification[]) => void;
const listeners = new Set<NotificationListener>();

function loadStoredNotifications(): CampusNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('[NotificationService] Failed to load notifications from storage:', err);
  }
  return [...INITIAL_NOTIFICATIONS];
}

function saveStoredNotifications(notifs: CampusNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifs));
  } catch (err) {
    console.error('[NotificationService] Failed to persist notifications:', err);
  }
}

let activeNotifications: CampusNotification[] = loadStoredNotifications();

function notifyListeners(): void {
  const current = [...activeNotifications];
  listeners.forEach((listener) => {
    try {
      listener(current);
    } catch (e) {
      console.error('[NotificationService] Listener error:', e);
    }
  });
}

export const notificationService = {
  subscribe(listener: NotificationListener): () => void {
    listeners.add(listener);
    listener([...activeNotifications]);
    return () => listeners.delete(listener);
  },

  async fetchNotifications(): Promise<CampusNotification[]> {
    if (!isApiConfigured()) {
      return [...activeNotifications];
    }
    try {
      const serverNotifs = await apiRequest<CampusNotification[]>(API_ENDPOINTS.notifications.list);
      activeNotifications = serverNotifs;
      saveStoredNotifications(activeNotifications);
      notifyListeners();
      return serverNotifs;
    } catch {
      return [...activeNotifications];
    }
  },

  getUnreadCount(): number {
    return activeNotifications.filter((n) => !n.read).length;
  },

  getNotifications(): CampusNotification[] {
    return [...activeNotifications];
  },

  async markAsRead(notificationId: string): Promise<void> {
    const item = activeNotifications.find((n) => n.id === notificationId);
    if (!item || item.read) return;

    item.read = true;
    saveStoredNotifications(activeNotifications);
    notifyListeners();

    if (isApiConfigured()) {
      await apiRequest<void>(API_ENDPOINTS.notifications.markRead(notificationId), {
        method: 'PATCH',
      }).catch((e) => console.warn('[NotificationService] Server markRead failed:', e));
    }
  },

  async markAllAsRead(): Promise<void> {
    let changed = false;
    activeNotifications.forEach((n) => {
      if (!n.read) {
        n.read = true;
        changed = true;
      }
    });

    if (changed) {
      saveStoredNotifications(activeNotifications);
      notifyListeners();
    }

    if (isApiConfigured()) {
      await apiRequest<void>(API_ENDPOINTS.notifications.markAllRead, {
        method: 'POST',
      }).catch((e) => console.warn('[NotificationService] Server markAllRead failed:', e));
    }
  },

  async pushNotification(payload: {
    type: NotificationType;
    title: string;
    message: string;
    userId?: string;
    data?: CampusNotification['data'];
  }): Promise<CampusNotification> {
    const newNotif: CampusNotification = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userId: payload.userId || 'u-demo-1',
      type: payload.type,
      title: payload.title,
      message: payload.message,
      timestamp: 'Just now',
      read: false,
      data: payload.data,
    };

    activeNotifications.unshift(newNotif);
    // Keep max 30 notifications in history
    if (activeNotifications.length > 30) {
      activeNotifications = activeNotifications.slice(0, 30);
    }
    saveStoredNotifications(activeNotifications);
    notifyListeners();
    return newNotif;
  },
};
