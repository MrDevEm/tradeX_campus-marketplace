import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { sendSuccess } from '../middleware/envelope.ts';

export const chatController = {
  async getConversations(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const conversations = await prisma.conversation.findMany({
        where: {
          OR: [{ buyerId: req.user.id }, { sellerId: req.user.id }],
        },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              price: true,
              type: true,
              images: true,
              status: true,
            },
          },
          buyer: {
            select: {
              id: true,
              fullName: true,
              studentProfile: true,
            },
          },
          seller: {
            select: {
              id: true,
              fullName: true,
              studentProfile: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      const formatted = await Promise.all(
        conversations.map(async (conv) => {
          const isBuyer = conv.buyerId === req.user?.id;
          const otherParty = isBuyer ? conv.seller : conv.buyer;
          const unreadCount = await prisma.chatMessage.count({
            where: {
              conversationId: conv.id,
              senderId: { not: req.user?.id },
              read: false,
            },
          });

          return {
            id: conv.id,
            listingId: conv.listingId,
            listing: conv.listing,
            lastMessageAt: conv.lastMessageAt,
            pinned: isBuyer ? conv.pinnedByBuyer : conv.pinnedBySeller,
            unreadCount,
            lastMessage: conv.messages[0] || null,
            participant: {
              id: otherParty.id,
              fullName: otherParty.fullName,
              department: otherParty.studentProfile?.department || 'Student',
              avatarUrl: otherParty.studentProfile?.avatarUrl || null,
            },
          };
        })
      );

      return sendSuccess(res, formatted, 200, { total: formatted.length });
    } catch (err) {
      next(err);
    }
  },

  async createOrGetConversation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const { listingId } = req.body;
      const listing = await prisma.listing.findUnique({
        where: { id: String(listingId) },
      });

      if (!listing) {
        throw new AppError('Listing not found.', 404, 'NOT_FOUND');
      }

      if (listing.sellerId === req.user.id) {
        throw new AppError('You cannot initiate a chat for your own listing.', 400, 'CANNOT_CHAT_OWN_LISTING');
      }

      const conversation = await prisma.conversation.upsert({
        where: {
          listingId_buyerId_sellerId: {
            listingId: String(listingId),
            buyerId: req.user.id,
            sellerId: listing.sellerId,
          },
        },
        update: {},
        create: {
          listingId: String(listingId),
          buyerId: req.user.id,
          sellerId: listing.sellerId,
        },
        include: {
          listing: true,
          seller: {
            include: { studentProfile: true },
          },
        },
      });

      return sendSuccess(res, conversation, 201);
    } catch (err) {
      next(err);
    }
  },

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const conversation = await prisma.conversation.findUnique({
        where: { id: String(id) },
      });

      if (!conversation) {
        throw new AppError('Conversation not found.', 404, 'NOT_FOUND');
      }

      if (conversation.buyerId !== req.user.id && conversation.sellerId !== req.user.id) {
        throw new AppError('Access to this conversation is forbidden.', 403, 'FORBIDDEN');
      }

      // Mark unread messages sent by the other party as read
      await prisma.chatMessage.updateMany({
        where: {
          conversationId: String(id),
          senderId: { not: req.user.id },
          read: false,
        },
        data: { read: true },
      });

      const messages = await prisma.chatMessage.findMany({
        where: { conversationId: String(id) },
        include: {
          sender: {
            select: { id: true, fullName: true },
          },
          meetupSpot: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return sendSuccess(res, messages, 200, { total: messages.length });
    } catch (err) {
      next(err);
    }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const { text, isMeetupProposal, meetupSpotId } = req.body;

      const conversation = await prisma.conversation.findUnique({
        where: { id: String(id) },
      });

      if (!conversation) {
        throw new AppError('Conversation not found.', 404, 'NOT_FOUND');
      }

      if (conversation.buyerId !== req.user.id && conversation.sellerId !== req.user.id) {
        throw new AppError('Access to this conversation is forbidden.', 403, 'FORBIDDEN');
      }

      const message = await prisma.chatMessage.create({
        data: {
          conversationId: String(id),
          senderId: req.user.id,
          text: String(text),
          isMeetupProposal: Boolean(isMeetupProposal),
          meetupSpotId: meetupSpotId ? String(meetupSpotId) : null,
        },
        include: {
          sender: { select: { id: true, fullName: true } },
          meetupSpot: true,
        },
      });

      // Update conversation lastMessageAt
      await prisma.conversation.update({
        where: { id: String(id) },
        data: { lastMessageAt: new Date() },
      });

      // Notify the recipient
      const recipientId = conversation.buyerId === req.user.id ? conversation.sellerId : conversation.buyerId;
      await prisma.campusNotification.create({
        data: {
          userId: recipientId,
          type: 'CHAT',
          title: `New message from ${req.user.fullName}`,
          message: text.slice(0, 100),
          entityId: String(id),
        },
      });

      return sendSuccess(res, message, 201);
    } catch (err) {
      next(err);
    }
  },

  async getMeetupSpots(req: Request, res: Response, next: NextFunction) {
    try {
      let spots: unknown[] = [];
      try {
        spots = await prisma.campusMeetupSpot.findMany();
      } catch {
        // Fallback to static campus safe exchange zones if DB is offline
      }

      if (!spots || spots.length === 0) {
        spots = [
          {
            id: 'spot-1',
            name: 'Campus Gate 1 Security Checkpoint',
            description: 'Highest security, 24/7 guard presence, well-lit CCTV coverage.',
            safetyRating: 'Highest Security • 24/7 Monitored',
            landmark: 'Main Guard Pavilion',
          },
          {
            id: 'spot-2',
            name: 'Main Library Plaza (Fountain Area)',
            description: 'High foot-traffic, open space, campus security patrols.',
            safetyRating: 'High Visibility • High Foot Traffic',
            landmark: 'Central Fountain',
          },
          {
            id: 'spot-3',
            name: 'Student Union Lounge (Ground Floor)',
            description: 'Monitored indoor space, seating available, staff present.',
            safetyRating: 'Indoor Safe Zone • Staff Present',
            landmark: 'Information Desk',
          },
          {
            id: 'spot-4',
            name: 'Central Campus Cafeteria',
            description: 'Busy public area during daylight hours, video surveillance.',
            safetyRating: 'Public Space • Daylight Preferred',
            landmark: 'North Entrance',
          },
        ];
      }

      return sendSuccess(res, spots, 200, { total: spots.length });
    } catch (err) {
      next(err);
    }
  },
};
