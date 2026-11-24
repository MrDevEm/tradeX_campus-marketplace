import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.ts';
import { prisma } from '../db/prisma.ts';
import { AppError } from './errorHandler.ts';
import { signAccessToken } from '../services/token.service.ts';
import type { User, StudentProfile, VerificationRequest } from '@prisma/client';

export { signAccessToken };

export interface AuthenticatedUser extends User {
  studentProfile: StudentProfile | null;
  verificationRequests: VerificationRequest[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  status: string;
}

export function signUserToken(user: {
  id: string;
  email: string;
  role: string;
  status: string;
}): string {
  return signAccessToken(user);
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED')
    );
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        studentProfile: true,
        verificationRequests: {
          orderBy: { submittedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!user) {
      return next(new AppError('User not found or session invalid.', 401, 'INVALID_SESSION'));
    }

    if (user.status === 'SUSPENDED') {
      return next(
        new AppError('Your account has been suspended by campus moderators.', 403, 'ACCOUNT_SUSPENDED')
      );
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Session expired. Please log in again.', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN'));
  }
}

export async function optionalAuthenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        studentProfile: true,
        verificationRequests: {
          orderBy: { submittedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (user && user.status !== 'SUSPENDED') {
      req.user = user;
    }
    next();
  } catch {
    // If token invalid, proceed without authenticated user
    next();
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: requires role ${allowedRoles.join(' or ')}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}

export function requireApprovedUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
  }

  if (req.user.status !== 'APPROVED') {
    return next(
      new AppError(
        'Verified Student status required for this action.',
        403,
        'VERIFICATION_REQUIRED'
      )
    );
  }

  next();
}
