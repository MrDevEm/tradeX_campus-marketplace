import { Router } from 'express';
import { verificationController } from '../controllers/verification.controller.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import { uploadIdSchema } from '../validators/dev3.validator.ts';

export const verificationRouter = Router();

verificationRouter.post(
  '/upload-id',
  authenticateToken,
  validateBody(uploadIdSchema),
  verificationController.uploadId
);

verificationRouter.get(
  '/status',
  authenticateToken,
  verificationController.getStatus
);
