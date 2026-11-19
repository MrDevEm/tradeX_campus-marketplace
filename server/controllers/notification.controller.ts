import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { sendSuccess } from '../middleware/envelope.ts';

export const notificationController = {
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const notifications = await prisma.campusNotification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const unreadCount = await prisma.campusNotification.count({
        where: {
          userId: req.user.id,
          read: false,
        },
      });

      return sendSuccess(res, {
        notifications,
        unreadCount,
      });
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;

      const notification = await prisma.campusNotification.findUnique({
        where: { id: String(id) },
      });

      if (!notification || notification.userId !== req.user.id) {
        throw new AppError('Notification not found.', 404, 'NOT_FOUND');
      }

      await prisma.campusNotification.update({
        where: { id: String(id) },
        data: { read: true },
      });

      return sendSuccess(res, { success: true, id: String(id) });
    } catch (err) {
      next(err);
    }
  },

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      await prisma.campusNotification.updateMany({
        where: {
          userId: req.user.id,
          read: false,
        },
        data: { read: true },
      });

      return sendSuccess(res, { success: true, message: 'All notifications marked as read.' });
    } catch (err) {
      next(err);
    }
  },
};
