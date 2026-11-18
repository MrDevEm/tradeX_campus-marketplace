import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from './envelope.ts';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(message: string, statusCode = 400, code = 'APP_ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(
      res,
      'Validation failed: ' + formattedErrors.map((f) => f.message).join('; '),
      400,
      'VALIDATION_ERROR',
      formattedErrors
    );
  }

  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  console.error('[Unhandled Server Error]:', err);
  const message =
    err instanceof Error ? err.message : 'An unexpected server error occurred';

  return sendError(res, message, 500, 'INTERNAL_SERVER_ERROR');
}
