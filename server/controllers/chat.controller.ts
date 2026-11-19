import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { sendSuccess } from '../middleware/envelope.ts';
import { broadcastToConversation, broadcastToUser } from '../realtime/gateway.ts';

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
      const notif = await prisma.campusNotification.create({
        data: {
          userId: recipientId,
          type: 'CHAT',
          title: `New message from ${req.user.fullName}`,
          message: text.slice(0, 100),
          entityId: String(id),
        },
      });

      // Real-time WebSocket broadcasts
      broadcastToConversation(String(id), 'new-message', {
        id: message.id,
        conversationId: String(id),
        senderId: req.user.id,
        senderName: req.user.fullName,
        text: message.text,
        isMeetupProposal: message.isMeetupProposal,
        meetupSpot: message.meetupSpot,
        createdAt: message.createdAt,
      });

      broadcastToUser(recipientId, 'new-notification', {
        id: notif.id,
        type: 'CHAT',
        title: notif.title,
        message: notif.message,
        entityId: String(id),
        createdAt: notif.createdAt,
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
            id: 'spot-lib',
            name: 'Main Library Plaza (North Entrance)',
            description: 'Well-lit central campus area with security presence and CCTV coverage.',
            safetyRating: 'Verified Safe Zone • High Foot Traffic',
            landmark: 'Opposite Academic Quadrangle',
          },
          {
            id: 'spot-union',
            name: 'Student Union Lounge (Ground Floor)',
            description: 'Open indoor student area with daylight hours and campus Wi-Fi.',
            safetyRating: 'Verified Safe Zone • Daytime Access',
            landmark: 'Ground Floor Atrium',
          },
          {
            id: 'spot-gate1',
            name: 'Campus Gate 1 Security Checkpoint',
            description: 'University security staff present 24/7; safest exchange spot for high-value items.',
            safetyRating: 'Highest Security • 24/7 Monitored',
            landmark: 'Main Campus Guard Pavilion',
          },
          {
            id: 'spot-cafe',
            name: 'Central Campus Cafeteria Entrance',
            description: 'Active student gathering point during lunchtime and late afternoon.',
            safetyRating: 'Verified Safe Zone • Peak Hours',
            landmark: 'Near Student Services Building',
          },
        ];
      }

      return sendSuccess(res, spots, 200, { total: spots.length });
    } catch (err) {
      next(err);
    }
  },
};
