import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { sendSuccess } from '../middleware/envelope.ts';
import { storageService } from '../services/storage.service.ts';

export const uploadRouter = Router();

uploadRouter.use(authenticateToken);

/**
 * POST /api/upload/presigned-url
 * Generates an S3 presigned PUT URL for direct browser-to-bucket file uploads.
 */
uploadRouter.post('/presigned-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename, contentType, folder } = req.body;

    if (!filename || !contentType) {
      throw new AppError('Filename and contentType are required.', 400, 'VALIDATION_ERROR');
    }

    const payload = await storageService.getPresignedUploadUrl({
      filename,
      contentType,
      folder: folder || 'listings',
    });

    return sendSuccess(res, payload, 200);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/upload/direct
 * Handles direct base64 uploads, offloading to S3 or local static storage.
 */
uploadRouter.post('/direct', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image, folder } = req.body;

    if (!image) {
      throw new AppError('Image payload is required.', 400, 'VALIDATION_ERROR');
    }

    const fileUrl = await storageService.uploadBase64Image(image, folder || 'listings');
    return sendSuccess(res, { fileUrl }, 200);
  } catch (err) {
    next(err);
  }
});
