import http from 'node:http';
import { app } from './app.ts';
import { ENV } from './config/env.ts';
import { prisma } from './db/prisma.ts';
import { initWebSocketServer } from './realtime/gateway.ts';

const PORT = ENV.PORT;
const server = http.createServer(app);
initWebSocketServer(server);

async function startServer() {
  try {
    // Verify DB connection if configured
    if (process.env.DATABASE_URL) {
      try {
        await prisma.$connect();
        console.log('✅ Connected to Neon PostgreSQL database.');
      } catch (dbErr) {
        console.warn('⚠️ Could not connect to Neon PostgreSQL database, continuing with fallback:', dbErr instanceof Error ? dbErr.message : dbErr);
      }
    } else {
      console.log('ℹ️ DATABASE_URL not set in .env. Server running with fallback endpoints and live WebSocket gateway.');
    }

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 tradeX Backend API Server running at http://localhost:${PORT}`);
      console.log(`📡 Health endpoint: http://localhost:${PORT}/api/health`);
      console.log(`⚡ WebSocket Gateway running at ws://localhost:${PORT}/ws`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Shutting down tradeX server gracefully...`);

  // Force exit after 10 seconds if any connection fails to close
  const forceExitTimer = setTimeout(() => {
    console.error('⚠️ Graceful shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000);
  if (forceExitTimer.unref) {
    forceExitTimer.unref();
  }

  server.close(async (err) => {
    if (err) {
      console.error('❌ Error closing HTTP and WebSocket server:', err);
    } else {
      console.log('✅ HTTP & WebSocket server closed.');
    }

    try {
      await prisma.$disconnect();
      console.log('✅ Neon PostgreSQL database connections disconnected cleanly.');
    } catch (dbErr) {
      console.error('❌ Error disconnecting from database:', dbErr);
    }

    process.exit(0);
  });
}

if (process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  startServer();
}

export { app, server, gracefulShutdown };
