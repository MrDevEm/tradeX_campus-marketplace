import type http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.ts';

interface SocketUser {
  userId: string;
  fullName: string;
  role: string;
}

export interface ExtWebSocket extends WebSocket {
  isAlive?: boolean;
}

interface InboundMessage {
  type: 'auth' | 'subscribe' | 'unsubscribe' | 'typing' | 'ping';
  token?: string;
  channel?: string;
  conversationId?: string;
  isTyping?: boolean;
}

// In-memory channel registry: channelName -> Set of WebSockets
const channels = new Map<string, Set<WebSocket>>();
const socketChannels = new WeakMap<WebSocket, Set<string>>();
const socketUsers = new WeakMap<WebSocket, SocketUser>();

let wssInstance: WebSocketServer | null = null;

export function initWebSocketServer(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });
  wssInstance = wss;

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const extWs = ws as ExtWebSocket;
    extWs.isAlive = true;

    socketChannels.set(ws, new Set());

    ws.on('pong', () => {
      extWs.isAlive = true;
    });

    // Optional query parameter auth: /ws?token=...
    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');
      if (token) {
        authenticateSocket(ws, token);
      }
    } catch {
      // Ignore URL parsing errors for local sockets
    }

    ws.on('message', (raw: Buffer | string) => {
      try {
        const message: InboundMessage = JSON.parse(raw.toString());
        handleInboundMessage(ws, message);
      } catch (err) {
        sendToSocket(ws, 'error', { message: 'Invalid JSON payload' });
      }
    });

    ws.on('close', () => {
      cleanupSocket(ws);
    });

    ws.on('error', () => {
      cleanupSocket(ws);
    });

    // Send connection established confirmation
    sendToSocket(ws, 'connected', {
      status: 'connected',
      timestamp: new Date().toISOString(),
      service: 'tradeX Real-Time Gateway',
    });
  });

  // Server-initiated heartbeat to detect and cull dead sockets every 3 minutes (180,000 ms)
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((client) => {
      const extClient = client as ExtWebSocket;
      if (extClient.isAlive === false) {
        cleanupSocket(extClient);
        return extClient.terminate();
      }
      extClient.isAlive = false;
      extClient.ping();
    });
  }, 3 * 60 * 1000);

  if (heartbeatInterval.unref) {
    heartbeatInterval.unref();
  }

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

function authenticateSocket(ws: WebSocket, token: string): void {
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as {
      userId: string;
      fullName?: string;
      role?: string;
    };
    const user: SocketUser = {
      userId: decoded.userId,
      fullName: decoded.fullName || 'Student',
      role: decoded.role || 'STUDENT',
    };
    socketUsers.set(ws, user);

    // Auto-subscribe to private user channel
    subscribeChannel(ws, `private-user-${user.userId}`);

    sendToSocket(ws, 'authenticated', {
      userId: user.userId,
      message: 'Authenticated real-time connection established.',
    });
  } catch {
    sendToSocket(ws, 'auth_error', { message: 'Invalid or expired token.' });
  }
}

function handleInboundMessage(ws: WebSocket, msg: InboundMessage): void {
  switch (msg.type) {
    case 'auth':
      if (msg.token) {
        authenticateSocket(ws, msg.token);
      }
      break;

    case 'subscribe':
      if (msg.channel) {
        subscribeChannel(ws, msg.channel);
        sendToSocket(ws, 'subscribed', { channel: msg.channel });
      }
      break;

    case 'unsubscribe':
      if (msg.channel) {
        unsubscribeChannel(ws, msg.channel);
        sendToSocket(ws, 'unsubscribed', { channel: msg.channel });
      }
      break;

    case 'typing':
      if (msg.conversationId) {
        const user = socketUsers.get(ws);
        const channelName = `private-chat-${msg.conversationId}`;
        // Broadcast typing indicator to other users in the conversation
        broadcastToChannel(
          channelName,
          'typing',
          {
            conversationId: msg.conversationId,
            sender: user?.fullName || 'Student',
            isTyping: Boolean(msg.isTyping),
          },
          ws // Exclude sender
        );
      }
      break;

    case 'ping':
      sendToSocket(ws, 'pong', { timestamp: Date.now() });
      break;
  }
}

function subscribeChannel(ws: WebSocket, channelName: string): void {
  if (!channels.has(channelName)) {
    channels.set(channelName, new Set());
  }
  channels.get(channelName)!.add(ws);

  const clientSubscribed = socketChannels.get(ws);
  if (clientSubscribed) {
    clientSubscribed.add(channelName);
  }
}

function unsubscribeChannel(ws: WebSocket, channelName: string): void {
  const set = channels.get(channelName);
  if (set) {
    set.delete(ws);
    if (set.size === 0) {
      channels.delete(channelName);
    }
  }
  const clientSubscribed = socketChannels.get(ws);
  if (clientSubscribed) {
    clientSubscribed.delete(channelName);
  }
}

function cleanupSocket(ws: WebSocket): void {
  const clientSubscribed = socketChannels.get(ws);
  if (clientSubscribed) {
    for (const channelName of clientSubscribed) {
      const set = channels.get(channelName);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          channels.delete(channelName);
        }
      }
    }
  }
}

function sendToSocket(ws: WebSocket, event: string, data: unknown, channel?: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ event, channel, data }), (err) => {
        if (err) {
          // Dead client removed immediately on send failure
          cleanupSocket(ws);
          ws.terminate();
        }
      });
    } catch {
      cleanupSocket(ws);
      ws.terminate();
    }
  } else {
    cleanupSocket(ws);
  }
}

/**
 * Broadcast an event to all subscribers of a channel (optionally excluding one socket)
 */
export function broadcastToChannel(
  channel: string,
  event: string,
  data: unknown,
  excludeWs?: WebSocket
): void {
  const subscribers = channels.get(channel);
  if (!subscribers) return;

  const deadSockets: WebSocket[] = [];

  for (const ws of subscribers) {
    if (ws === excludeWs) continue;

    if (ws.readyState === WebSocket.OPEN) {
      sendToSocket(ws, event, data, channel);
    } else {
      deadSockets.push(ws);
    }
  }

  // Prune dead clients immediately so broadcast fan-out never leaks
  for (const dead of deadSockets) {
    cleanupSocket(dead);
  }
}

/**
 * Broadcast to a conversation channel: private-chat-{conversationId}
 */
export function broadcastToConversation(conversationId: string, event: string, data: unknown): void {
  broadcastToChannel(`private-chat-${conversationId}`, event, data);
}

/**
 * Broadcast to a private user channel: private-user-{userId}
 */
export function broadcastToUser(userId: string, event: string, data: unknown): void {
  broadcastToChannel(`private-user-${userId}`, event, data);
}

/**
 * Returns strictly active, open WebSocket connections
 */
export function getConnectedClientsCount(): number {
  if (!wssInstance) return 0;
  let activeCount = 0;
  for (const client of wssInstance.clients) {
    if (client.readyState === WebSocket.OPEN) {
      activeCount++;
    }
  }
  return activeCount;
}
