import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { sendSuccess } from '../middleware/envelope.ts';
import {
  ListingType,
  ListingCondition,
  ListingStatus,
  UserRole,
  type Listing,
  type User,
  type StudentProfile,
  type SavedListing,
} from '@prisma/client';

type ListingWithRelations = Listing & {
  seller?: (User & { studentProfile?: StudentProfile | null }) | null;
  savedBy?: SavedListing[];
};

export function formatListing(item: ListingWithRelations, currentUserId?: string) {
  const priceNum = Number(item.price);

  let mappedType: 'Buy / Sell' | 'Swap' | 'Giveaway' = 'Buy / Sell';
  let typeClass: 'type-sell' | 'type-swap' | 'type-free' = 'type-sell';

  if (priceNum === 0) {
    mappedType = 'Giveaway';
    typeClass = 'type-free';
  } else if (item.type === ListingType.SWAP) {
    mappedType = 'Swap';
    typeClass = 'type-swap';
  } else {
    mappedType = 'Buy / Sell';
    typeClass = 'type-sell';
  }

  let priceLabel = `${priceNum.toLocaleString()} ETB`;
  if (priceNum === 0) {
    priceLabel = 'Free';
  } else if (item.type === ListingType.SWAP) {
    priceLabel = `Swap / ${priceNum.toLocaleString()} ETB`;
  }

  let conditionLabel = 'Good Condition';
  switch (item.condition) {
    case ListingCondition.BRAND_NEW:
      conditionLabel = 'Brand New';
      break;
    case ListingCondition.LIKE_NEW:
      conditionLabel = 'Like New';
      break;
    case ListingCondition.EXCELLENT:
      conditionLabel = 'Excellent';
      break;
    case ListingCondition.GOOD:
      conditionLabel = 'Good Condition';
      break;
    case ListingCondition.FAIR:
      conditionLabel = 'Fair';
      break;
    default:
      conditionLabel = String(item.condition);
  }

  const isSaved =
    Boolean(currentUserId) &&
    Array.isArray(item.savedBy) &&
    item.savedBy.some((s) => s.userId === currentUserId);

  const imagesList = Array.isArray(item.images) && item.images.length > 0 ? item.images : [];
  const primaryImg = imagesList[0] || '/images/products/book.png';

  const sellerName = item.seller?.fullName || 'Campus Student';
  const deptLabel = item.seller?.studentProfile
    ? `${item.seller.studentProfile.department}, ${item.seller.studentProfile.academicYear}`
    : 'Mekelle University Student';

  return {
    id: item.id,
    title: item.title,
    category: item.category,
    type: mappedType,
    typeClass,
    price: priceNum,
    priceLabel,
    condition: conditionLabel,
    spot: item.campusSpot,
    campusSpot: item.campusSpot,
    seller: sellerName,
    sellerId: item.sellerId,
    dept: deptLabel,
    desc: item.description,
    description: item.description,
    img: primaryImg,
    images: imagesList,
    saved: isSaved,
    status: item.status,
    viewsCount: item.viewsCount,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function parseListingType(val?: string): ListingType {
  if (!val) return ListingType.SELL;
  const upper = val.toUpperCase().trim();
  if (upper === 'SWAP') return ListingType.SWAP;
  if (upper === 'BUY') return ListingType.BUY;
  return ListingType.SELL;
}

function parseListingCondition(val?: string): ListingCondition {
  if (!val) return ListingCondition.GOOD;
  const normalized = val.toUpperCase().replace(/\s+/g, '_').trim();
  if (normalized.includes('BRAND')) return ListingCondition.BRAND_NEW;
  if (normalized.includes('LIKE')) return ListingCondition.LIKE_NEW;
  if (normalized.includes('EXCELLENT')) return ListingCondition.EXCELLENT;
  if (normalized.includes('FAIR')) return ListingCondition.FAIR;
  return ListingCondition.GOOD;
}

export const listingController = {
  async getListings(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        q,
        search,
        category,
        type,
        condition,
        status,
        minPrice,
        maxPrice,
        sort,
        limit,
        cursor,
      } = req.query;

      const take = Math.min(Math.max(parseInt(String(limit || 20), 10) || 20, 1), 50);
      const queryStr = String(q || search || '').trim();
      const currentUserId = req.user?.id;

      // Construct Prisma where filter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};

      // Status filter (default ACTIVE unless explicitly specified)
      if (status && status !== 'ALL') {
        const upperStatus = String(status).toUpperCase();
        if (Object.values(ListingStatus).includes(upperStatus as ListingStatus)) {
          where.status = upperStatus as ListingStatus;
        } else {
          where.status = ListingStatus.ACTIVE;
        }
      } else if (!status) {
        where.status = ListingStatus.ACTIVE;
      }

      // Category filter
      if (category && category !== 'all' && category !== 'All') {
        where.category = {
          equals: String(category),
          mode: 'insensitive',
        };
      }

      // Type filter
      if (type && type !== 'all') {
        const typeStr = String(type).toLowerCase();
        if (typeStr.includes('swap')) {
          where.type = ListingType.SWAP;
        } else if (typeStr.includes('buy') || typeStr.includes('sell')) {
          where.type = { in: [ListingType.SELL, ListingType.BUY] };
        } else if (typeStr.includes('free') || typeStr.includes('giveaway')) {
          where.price = 0;
        }
      }

      // Condition filter
      if (condition && condition !== 'all') {
        where.condition = parseListingCondition(String(condition));
      }

      // Price range
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined && !isNaN(Number(minPrice))) {
          where.price.gte = Number(minPrice);
        }
        if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
          where.price.lte = Number(maxPrice);
        }
      }

      // Search query filter (title or description)
      if (queryStr) {
        where.OR = [
          { title: { contains: queryStr, mode: 'insensitive' } },
          { description: { contains: queryStr, mode: 'insensitive' } },
          { campusSpot: { contains: queryStr, mode: 'insensitive' } },
        ];
      }

      // Sorting
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let orderBy: any = { createdAt: 'desc' };
      if (sort === 'price-low') {
        orderBy = { price: 'asc' };
      } else if (sort === 'price-high') {
        orderBy = { price: 'desc' };
      }

      // Cursor-based pagination arguments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paginationArgs: any = {
        take: take + 1, // Take one extra to determine hasMore
        orderBy,
        include: {
          seller: {
            include: {
              studentProfile: true,
            },
          },
          savedBy: currentUserId
            ? {
                where: { userId: currentUserId },
              }
            : false,
        },
      };

      if (cursor) {
        paginationArgs.cursor = { id: String(cursor) };
        paginationArgs.skip = 1;
      }

      const total = await prisma.listing.count({ where });
      const items = await prisma.listing.findMany({
        where,
        ...paginationArgs,
      });

      const hasMore = items.length > take;
      const listingsToReturn = hasMore ? items.slice(0, take) : items;
      const nextCursor = hasMore ? listingsToReturn[listingsToReturn.length - 1]?.id : null;

      const formatted = listingsToReturn.map((item) => formatListing(item, currentUserId));

      return sendSuccess(res, formatted, 200, {
        total,
        count: formatted.length,
        hasMore,
        nextCursor,
      });
    } catch (err) {
      next(err);
    }
  },

  async getListingById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      const item = await prisma.listing.findUnique({
        where: { id },
        include: {
          seller: {
            include: {
              studentProfile: true,
            },
          },
          savedBy: currentUserId
            ? {
                where: { userId: currentUserId },
              }
            : false,
        },
      });

      if (!item) {
        throw new AppError('Listing not found.', 404, 'LISTING_NOT_FOUND');
      }

      // Increment viewsCount
      await prisma.listing.update({
        where: { id },
        data: { viewsCount: { increment: 1 } },
      }).catch(() => {
        // Non-blocking view increment
      });

      const formatted = formatListing(item, currentUserId);
      return sendSuccess(res, formatted, 200);
    } catch (err) {
      next(err);
    }
  },

  async createListing(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const {
        title,
        category,
        type,
        price,
        condition,
        campusSpot,
        spot,
        description,
        desc,
        images,
        img,
        imageDataUrl,
      } = req.body;

      const resolvedSpot = String(campusSpot || spot || 'Main Library Plaza').trim();
      const resolvedDesc = String(description || desc || '').trim();
      const resolvedType = parseListingType(type);
      const resolvedCondition = parseListingCondition(condition);

      const resolvedImages: string[] = [];
      if (Array.isArray(images) && images.length > 0) {
        resolvedImages.push(...images.map(String));
      } else if (img) {
        resolvedImages.push(String(img));
      } else if (imageDataUrl) {
        resolvedImages.push(String(imageDataUrl));
      } else {
        resolvedImages.push('/images/products/book.png');
      }

      const newListing = await prisma.listing.create({
        data: {
          sellerId: req.user.id,
          title: String(title).trim(),
          category: String(category).trim(),
          type: resolvedType,
          price: Number(price),
          condition: resolvedCondition,
          campusSpot: resolvedSpot,
          description: resolvedDesc,
          images: resolvedImages,
          status: ListingStatus.ACTIVE,
        },
        include: {
          seller: {
            include: {
              studentProfile: true,
            },
          },
        },
      });

      const formatted = formatListing(newListing, req.user.id);
      return sendSuccess(res, formatted, 201);
    } catch (err) {
      next(err);
    }
  },

  async updateListing(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const listing = await prisma.listing.findUnique({
        where: { id },
      });

      if (!listing) {
        throw new AppError('Listing not found.', 404, 'LISTING_NOT_FOUND');
      }

      // Owner check (or Admin)
      const isOwner = listing.sellerId === req.user.id;
      const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPERADMIN;

      if (!isOwner && !isAdmin) {
        throw new AppError(
          'Forbidden: You are not authorized to edit this listing.',
          403,
          'FORBIDDEN'
        );
      }

      const {
        title,
        category,
        type,
        price,
        condition,
        campusSpot,
        spot,
        description,
        desc,
        images,
        status,
      } = req.body;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataToUpdate: any = {};
      if (title !== undefined) dataToUpdate.title = String(title).trim();
      if (category !== undefined) dataToUpdate.category = String(category).trim();
      if (type !== undefined) dataToUpdate.type = parseListingType(type);
      if (price !== undefined) dataToUpdate.price = Number(price);
      if (condition !== undefined) dataToUpdate.condition = parseListingCondition(condition);
      if (campusSpot !== undefined || spot !== undefined) {
        dataToUpdate.campusSpot = String(campusSpot || spot).trim();
      }
      if (description !== undefined || desc !== undefined) {
        dataToUpdate.description = String(description || desc).trim();
      }
      if (Array.isArray(images)) dataToUpdate.images = images.map(String);
      if (status !== undefined) dataToUpdate.status = status as ListingStatus;

      const updated = await prisma.listing.update({
        where: { id },
        data: dataToUpdate,
        include: {
          seller: {
            include: {
              studentProfile: true,
            },
          },
        },
      });

      const formatted = formatListing(updated, req.user.id);
      return sendSuccess(res, formatted, 200);
    } catch (err) {
      next(err);
    }
  },

  async closeListing(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const { reason } = req.body;

      const listing = await prisma.listing.findUnique({
        where: { id },
      });

      if (!listing) {
        throw new AppError('Listing not found.', 404, 'LISTING_NOT_FOUND');
      }

      const isOwner = listing.sellerId === req.user.id;
      const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPERADMIN;

      if (!isOwner && !isAdmin) {
        throw new AppError(
          'Forbidden: You are not authorized to close this listing.',
          403,
          'FORBIDDEN'
        );
      }

      let newStatus: ListingStatus = ListingStatus.SOLD;
      const normalizedReason = String(reason || 'SOLD').toUpperCase();
      if (normalizedReason === 'SWAPPED' || normalizedReason === 'PENDING_SWAP') {
        newStatus = ListingStatus.PENDING_SWAP;
      } else if (normalizedReason === 'WITHDRAWN' || normalizedReason === 'REMOVED') {
        newStatus = ListingStatus.REMOVED;
      } else {
        newStatus = ListingStatus.SOLD;
      }

      const updated = await prisma.listing.update({
        where: { id },
        data: { status: newStatus },
        include: {
          seller: {
            include: {
              studentProfile: true,
            },
          },
        },
      });

      const formatted = formatListing(updated, req.user.id);
      return sendSuccess(res, formatted, 200, {
        closureReason: normalizedReason,
      });
    } catch (err) {
      next(err);
    }
  },

  async toggleSave(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const { saved } = req.body;

      const listing = await prisma.listing.findUnique({
        where: { id },
      });

      if (!listing) {
        throw new AppError('Listing not found.', 404, 'LISTING_NOT_FOUND');
      }

      if (saved) {
        await prisma.savedListing.upsert({
          where: {
            userId_listingId: {
              userId: req.user.id,
              listingId: id,
            },
          },
          update: {},
          create: {
            userId: req.user.id,
            listingId: id,
          },
        });
      } else {
        await prisma.savedListing.deleteMany({
          where: {
            userId: req.user.id,
            listingId: id,
          },
        });
      }

      return sendSuccess(res, { saved: Boolean(saved) }, 200);
    } catch (err) {
      next(err);
    }
  },
};
