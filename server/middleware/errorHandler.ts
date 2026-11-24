import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from './envelope.ts';
import { logError } from '../services/logger.service.ts';

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
    if (err.statusCode >= 500) {
      logError(err, req);
    }
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  // Ship unexpected server error context securely to Axiom / centralized logger
  logError(err, req);

  // Error Response Security: Never expose stack traces, database queries, internal paths or sensitive details in production responses
  const isProduction = process.env.NODE_ENV === 'production';
  const safeMessage = isProduction
    ? 'An unexpected internal server error occurred.'
    : err instanceof Error
      ? err.message
      : 'An unexpected server error occurred';

  return sendError(res, safeMessage, 500, 'INTERNAL_SERVER_ERROR');
}
