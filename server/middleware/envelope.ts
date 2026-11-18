import type { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta: Record<string, unknown> = {}
) {
  const envelopeMeta = {
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const isPlainObject =
    data !== null && typeof data === 'object' && !Array.isArray(data);

  const payload = isPlainObject
    ? {
        ...data,
        data,
        error: null,
        meta: envelopeMeta,
      }
    : {
        data,
        error: null,
        meta: envelopeMeta,
      };

  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  code = 'BAD_REQUEST',
  details?: unknown
) {
  return res.status(statusCode).json({
    data: null,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    message,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}
