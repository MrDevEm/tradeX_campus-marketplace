import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import { createConversationSchema, sendMessageSchema } from '../validators/dev3.validator.ts';

export const chatRouter = Router();

chatRouter.get(
  '/conversations',
  authenticateToken,
  chatController.getConversations
);

chatRouter.post(
  '/conversations',
  authenticateToken,
  validateBody(createConversationSchema),
  chatController.createOrGetConversation
);

chatRouter.get(
  '/conversations/:id/messages',
  authenticateToken,
  chatController.getMessages
);

chatRouter.post(
  '/conversations/:id/messages',
  authenticateToken,
  validateBody(sendMessageSchema),
  chatController.sendMessage
);

chatRouter.get(
  '/meetup-spots',
  chatController.getMeetupSpots
);
