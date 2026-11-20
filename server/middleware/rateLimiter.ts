import type { Request, Response, NextFunction } from 'express';
import { sendError } from './envelope.ts';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipInTests?: boolean;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests. Please try again later.',
    skipInTests = true,
  } = options;

  const clients = new Map<string, ClientRecord>();

  // Cleanup expired entries periodically (every 5 minutes)
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of clients.entries()) {
      if (now > record.resetTime) {
        clients.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (timer.unref) {
    timer.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    if (skipInTests && process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const key = `${ip}:${req.baseUrl || req.path}`;
    const now = Date.now();

    let record = clients.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      clients.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', retryAfterSeconds);
      return sendError(
        res,
        `${message} Please try again in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`,
        429,
        'TOO_MANY_REQUESTS',
        { retryAfter: retryAfterSeconds }
      );
    }

    next();
  };
}

// Preset rate limiters:
// Strict rate limiter for sensitive authentication & OTP endpoints (20 attempts per 15 minutes in production)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many authentication attempts.',
  skipInTests: true,
});

// General API rate limiter (200 requests per minute)
export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 200,
  message: 'Too many requests.',
  skipInTests: true,
});
