import { app } from './app.ts';
import { ENV } from './config/env.ts';
import { prisma } from './db/prisma.ts';

const PORT = ENV.PORT;

async function startServer() {
  try {
    // Verify DB connection
    await prisma.$connect();
    console.log('✅ Connected to Neon PostgreSQL database.');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 tradeX Backend API Server running at http://localhost:${PORT}`);
      console.log(`📡 Health endpoint: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
