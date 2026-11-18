import { Router } from 'express';
import { sendSuccess } from '../middleware/envelope.ts';
import { prisma } from '../db/prisma.ts';

export const healthRouter = Router();

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
