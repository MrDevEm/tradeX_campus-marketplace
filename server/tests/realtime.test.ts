import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.ts';
import { ENV } from '../config/env.ts';
import {
  initWebSocketServer,
  broadcastToConversation,
  broadcastToUser,
  getConnectedClientsCount,
} from '../realtime/gateway.ts';

describe('Phase 4: Real-Time WebSocket & Chat Event Gateway', () => {
  let server: http.Server;
  let serverPort = 0;
  let clientA: WebSocket;
  let clientB: WebSocket;

  const userA = { userId: 'user-a-123', fullName: 'Dawit M.', role: 'STUDENT' };
  const userB = { userId: 'user-b-456', fullName: 'Helen G.', role: 'STUDENT' };

  const tokenA = jwt.sign(userA, ENV.JWT_SECRET, { expiresIn: '1h' });
  const tokenB = jwt.sign(userB, ENV.JWT_SECRET, { expiresIn: '1h' });

  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    initWebSocketServer(server);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          serverPort = addr.port;
        }
        resolve();
      });
    });
  });

  after(async () => {
    if (clientA && clientA.readyState === WebSocket.OPEN) clientA.close();
    if (clientB && clientB.readyState === WebSocket.OPEN) clientB.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('establishes WebSocket connection and receives connected greeting', async () => {
    clientA = new WebSocket(`ws://127.0.0.1:${serverPort}/ws`);

    const greeting = await new Promise<{ event: string }>((resolve) => {
      clientA.once('message', (raw) => {
        resolve(JSON.parse(raw.toString()));
      });
    });

    assert.strictEqual(greeting.event, 'connected');
  });

  it('authenticates WebSocket connection using JWT token', async () => {
    clientA.send(JSON.stringify({ type: 'auth', token: tokenA }));

    const authRes = await new Promise<{ event: string; data: { userId: string } }>((resolve) => {
      clientA.once('message', (raw) => {
        resolve(JSON.parse(raw.toString()));
      });
    });

    assert.strictEqual(authRes.event, 'authenticated');
    assert.strictEqual(authRes.data.userId, userA.userId);
  });

  it('subscribes to conversation channel and receives subscription confirmation', async () => {
    clientA.send(JSON.stringify({ type: 'subscribe', channel: 'private-chat-conv1' }));

    const subRes = await new Promise<{ event: string; data: { channel: string } }>((resolve) => {
      clientA.once('message', (raw) => {
        resolve(JSON.parse(raw.toString()));
      });
    });

    assert.strictEqual(subRes.event, 'subscribed');
    assert.strictEqual(subRes.data.channel, 'private-chat-conv1');
  });

  it('relays typing status between two connected peers in the same conversation', async () => {
    clientB = new WebSocket(`ws://127.0.0.1:${serverPort}/ws?token=${tokenB}`);

    // Wait for client B connection and authentication
    await new Promise<void>((resolve) => {
      let count = 0;
      clientB.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.event === 'connected' || msg.event === 'authenticated') {
          count++;
          if (count === 2) resolve();
        }
      });
    });

    // Subscribe Client B to the same conversation
    clientB.send(JSON.stringify({ type: 'subscribe', channel: 'private-chat-conv1' }));
    await new Promise<void>((resolve) => {
      clientB.once('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.event === 'subscribed') resolve();
      });
    });

    // Setup listener on Client B for typing event
    const typingPromise = new Promise<{ event: string; data: { conversationId: string; sender: string; isTyping: boolean } }>((resolve) => {
      clientB.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.event === 'typing') resolve(msg);
      });
    });

    // Client A sends typing indicator
    clientA.send(JSON.stringify({ type: 'typing', conversationId: 'conv1', isTyping: true }));

    const typingReceived = await typingPromise;
    assert.strictEqual(typingReceived.event, 'typing');
    assert.strictEqual(typingReceived.data.conversationId, 'conv1');
    assert.strictEqual(typingReceived.data.sender, userA.fullName);
    assert.strictEqual(typingReceived.data.isTyping, true);
  });

  it('broadcasts new chat messages to all conversation subscribers', async () => {
    const messagePromiseA = new Promise<{ event: string; data: { text: string } }>((resolve) => {
      clientA.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.event === 'new-message') resolve(msg);
      });
    });

    const messagePromiseB = new Promise<{ event: string; data: { text: string } }>((resolve) => {
      clientB.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.event === 'new-message') resolve(msg);
      });
    });

    // Server broadcasts message to conv1
    broadcastToConversation('conv1', 'new-message', {
      id: 'msg-999',
      conversationId: 'conv1',
      senderId: userA.userId,
      text: 'Meeting at Main Library Plaza at 2pm!',
      isMeetupProposal: true,
    });

    const [receivedA, receivedB] = await Promise.all([messagePromiseA, messagePromiseB]);
    assert.strictEqual(receivedA.data.text, 'Meeting at Main Library Plaza at 2pm!');
    assert.strictEqual(receivedB.data.text, 'Meeting at Main Library Plaza at 2pm!');
  });

  it('delivers private user notification exclusively to the target student socket', async () => {
    let clientAReceivedNotif = false;
    clientA.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.event === 'new-notification') {
        clientAReceivedNotif = true;
      }
    });

    const notifPromiseB = new Promise<{ event: string; data: { title: string } }>((resolve) => {
      clientB.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.event === 'new-notification') resolve(msg);
      });
    });

    // Send notification specifically to User B
    broadcastToUser(userB.userId, 'new-notification', {
      id: 'notif-1',
      type: 'VERIFICATION',
      title: 'Student Identity Approved',
      message: 'You can now trade on tradeX!',
    });

    const notifB = await notifPromiseB;
    assert.strictEqual(notifB.data.title, 'Student Identity Approved');

    // Small delay to ensure Client A did not receive Client B's notification
    await new Promise((r) => setTimeout(r, 50));
    assert.strictEqual(clientAReceivedNotif, false, 'Client A should not receive User B private notification');
  });

  it('counts only active OPEN connections and prunes dead clients without inflating counts', async () => {
    const initialCount = getConnectedClientsCount();
    assert.strictEqual(initialCount >= 2, true);

    // Create a temporary client and connect
    const tempClient = new WebSocket(`ws://127.0.0.1:${serverPort}/ws`);
    await new Promise<void>((resolve) => tempClient.once('open', () => resolve()));

    const countWithTemp = getConnectedClientsCount();
    assert.strictEqual(countWithTemp, initialCount + 1);

    // Terminate abruptly (simulating dead socket / drop)
    tempClient.terminate();
    await new Promise((r) => setTimeout(r, 60));

    // After termination, client count must match active sockets only
    const countAfterDrop = getConnectedClientsCount();
    assert.strictEqual(countAfterDrop, initialCount);
  });
});
