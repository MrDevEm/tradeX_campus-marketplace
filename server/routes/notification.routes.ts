import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.ts';
import { authenticateToken } from '../middleware/auth.ts';

export const notificationRouter = Router();

notificationRouter.get(
  '/',
  authenticateToken,
  notificationController.getNotifications
);

notificationRouter.post(
  '/:id/read',
  authenticateToken,
  notificationController.markAsRead
);

notificationRouter.post(
  '/read-all',
  authenticateToken,
  notificationController.markAllAsRead
);
