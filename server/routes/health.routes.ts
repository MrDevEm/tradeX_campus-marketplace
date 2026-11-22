import { Router } from 'express';
import { sendSuccess } from '../middleware/envelope.ts';
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

healthRouter.get('/health', async (req, res, next) => {
  try {
    // Quick DB ping
    await prisma.$queryRaw`SELECT 1`;

    return sendSuccess(res, {
      status: 'healthy',
      database: 'connected',
      uptime: process.uptime(),
      service: 'tradeX Backend API',
    });
  } catch (err) {
    next(err);
  }
});
