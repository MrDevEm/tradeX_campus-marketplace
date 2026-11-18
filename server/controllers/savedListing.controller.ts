import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { sendSuccess } from '../middleware/envelope.ts';
import { formatListing } from './listing.controller.ts';

export const savedListingController = {
  async getSavedListings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const savedEntries = await prisma.savedListing.findMany({
        where: { userId: req.user.id },
        include: {
          listing: {
            include: {
              seller: {
                include: {
                  studentProfile: true,
                },
              },
              savedBy: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = savedEntries.map((entry) =>
        formatListing(entry.listing, req.user?.id)
      );

      return sendSuccess(res, formatted, 200, {
        total: formatted.length,
      });
    } catch (err) {
      next(err);
    }
  },

  async saveListing(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const { listingId } = req.body;
      const listing = await prisma.listing.findUnique({
        where: { id: String(listingId) },
      });

      if (!listing) {
        throw new AppError('Listing not found.', 404, 'LISTING_NOT_FOUND');
      }

      await prisma.savedListing.upsert({
        where: {
          userId_listingId: {
            userId: req.user.id,
            listingId: String(listingId),
          },
        },
        update: {},
        create: {
          userId: req.user.id,
          listingId: String(listingId),
        },
      });

      return sendSuccess(res, { saved: true, listingId }, 201);
    } catch (err) {
      next(err);
    }
  },

  async removeSavedListing(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const { listingId } = req.params;

      await prisma.savedListing.deleteMany({
        where: {
          userId: req.user.id,
          listingId: String(listingId),
        },
      });

      return sendSuccess(res, { saved: false, listingId }, 200);
    } catch (err) {
      next(err);
    }
  },
};
