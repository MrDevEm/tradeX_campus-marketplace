import { Router } from 'express';
import { sendSuccess, sendError } from '../middleware/envelope.ts';
import { prisma } from '../db/prisma.ts';

export const healthRouter = Router();

healthRouter.get('/', async (req, res, next) => {
  try {
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      // Non-fatal for index ping
    }

    return sendSuccess(res, {
      service: 'tradeX Backend API',
      status: 'online',
      database: dbStatus,
      uptime: process.uptime(),
      version: '1.0.0',
      message: 'Welcome to the tradeX Campus Marketplace API.',
      endpoints: {
        health: '/api/health',
        readiness: '/api/health/ready',
        liveness: '/api/health/live',
        auth: '/api/auth',
        categories: '/api/categories',
        listings: '/api/listings',
        savedListings: '/api/saved-listings',
        verification: '/api/verification',
        notifications: '/api/notifications',
        chat: '/api/chat',
        admin: '/api/admin',
        dashboard: '/api/dashboard',
        websocket: '/ws',
      },
    });
  } catch (err) {
    next(err);
  }
});

// Liveness & health probe - checks web server and quick database availability
healthRouter.get('/health', async (req, res, next) => {
  try {
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      // Non-fatal if degraded
    }

    return sendSuccess(res, {
      status: 'healthy',
      database: dbStatus,
      uptime: process.uptime(),
      service: 'tradeX Backend API',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// Dedicated liveness probe
healthRouter.get('/health/live', async (req, res, next) => {
  try {
    return sendSuccess(res, {
      status: 'healthy',
      uptime: process.uptime(),
      service: 'tradeX Backend API',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// Readiness probe - strictly verifies database connection availability
healthRouter.get('/health/ready', async (req, res) => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;

    return sendSuccess(res, {
      status: 'ready',
      database: 'connected',
      latencyMs,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (dbErr) {
    return sendError(
      res,
      'Service not ready: Database connection unavailable.',
      503,
      'SERVICE_UNAVAILABLE',
      { database: 'disconnected', error: dbErr instanceof Error ? dbErr.message : String(dbErr) }
    );
  }
});
