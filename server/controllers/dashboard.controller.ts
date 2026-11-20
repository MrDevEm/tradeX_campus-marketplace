import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { sendSuccess } from '../middleware/envelope.ts';
import { formatListing } from './listing.controller.ts';

export const dashboardController = {
  /**
   * GET /api/dashboard/summary
   * Returns authenticated student's marketplace statistics:
   * activeListingsCount, savedItemsCount, unreadChatsCount, trustScore
   */
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const userId = req.user.id;

      // Count active listings created by this student
      const activeListingsCount = await prisma.listing.count({
        where: {
          sellerId: userId,
          status: 'ACTIVE',
        },
      });

      // Count saved items / bookmarks for this student
      const savedItemsCount = await prisma.savedListing.count({
        where: {
          userId,
        },
      });

      // Count unread chat messages in conversations involving this student
      const unreadChatsCount = await prisma.chatMessage.count({
        where: {
          read: false,
          senderId: { not: userId },
          conversation: {
            OR: [
              { buyerId: userId },
              { sellerId: userId },
            ],
          },
        },
      });

      // Calculate trust score based on student verification status
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          verificationRequests: {
            orderBy: { submittedAt: 'desc' },
            take: 1,
          },
        },
      });

      const latestVerification = user?.verificationRequests?.[0];
      let trustScore = '60%';
      if (user?.status === 'APPROVED' || latestVerification?.status === 'APPROVED') {
        trustScore = '98%';
      } else if (user?.status === 'PENDING_APPROVAL' || latestVerification?.status === 'PENDING_APPROVAL') {
        trustScore = '75%';
      } else if (user?.status === 'PENDING_UPLOAD') {
        trustScore = '50%';
      }

      const summary = {
        activeListingsCount,
        savedItemsCount,
        unreadChatsCount,
        trustScore,
      };

      return sendSuccess(res, summary, 200);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/dashboard/listings
   * Returns list of listings created by the authenticated student
   */
  async getMyListings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const userId = req.user.id;

      const items = await prisma.listing.findMany({
        where: {
          sellerId: userId,
          status: { not: 'REMOVED' },
        },
        include: {
          seller: {
            include: {
              studentProfile: true,
            },
          },
          savedBy: {
            where: {
              userId,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const formatted = items.map((item) => formatListing(item, userId));
      return sendSuccess(res, formatted, 200, {
        total: formatted.length,
      });
    } catch (err) {
      next(err);
    }
  },
};
