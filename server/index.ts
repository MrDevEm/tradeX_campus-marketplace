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

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, server };
