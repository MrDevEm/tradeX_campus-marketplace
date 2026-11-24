import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.ts';
import { prisma } from '../db/prisma.ts';
import { AppError } from '../middleware/errorHandler.ts';

export interface TokenUser {
  id: string;
  email: string;
  role: string;
  status: string;
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
  status: string;
}

const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // 7 days refresh token

/**
 * Sign a short-lived JWT access token (15 minutes).
 */
export function signAccessToken(user: TokenUser): string {
  const payload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
  };

  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * SHA-256 hash a refresh token before persisting to the database.
 */
function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generate and store a revocable refresh token in the database.
 */
export async function createRefreshToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return rawToken;
}

/**
 * Validates, revokes, and rotates a refresh token, issuing a new access token & refresh token.
 */
export async function rotateRefreshToken(rawToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  user: TokenUser;
}> {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new AppError('Refresh token is required.', 400, 'INVALID_TOKEN');
  }

  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!existing) {
    throw new AppError('Invalid refresh token.', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (existing.revokedAt) {
    // Possible token reuse attack detected: revoke all tokens for this user
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AppError('Refresh token has already been revoked. Session terminated for security.', 401, 'TOKEN_REVOKED');
  }

  if (new Date() > existing.expiresAt) {
    throw new AppError('Refresh token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
  }

  if (existing.user.status === 'SUSPENDED') {
    throw new AppError('Your account has been suspended by campus moderators.', 403, 'ACCOUNT_SUSPENDED');
  }

  // Revoke the used token (refresh token rotation)
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  // Issue new pair
  const newAccessToken = signAccessToken({
    id: existing.user.id,
    email: existing.user.email,
    role: existing.user.role,
    status: existing.user.status,
  });
  const newRefreshToken = await createRefreshToken(existing.user.id);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: {
      id: existing.user.id,
      email: existing.user.email,
      role: existing.user.role,
      status: existing.user.status,
    },
  };
}

/**
 * Revoke a specific refresh token (used during logout).
 */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  if (!rawToken || typeof rawToken !== 'string') return;
  const tokenHash = hashToken(rawToken);
  try {
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (err) {
    console.warn('[TokenService] Failed to revoke refresh token:', err);
  }
}

/**
 * Revoke all refresh tokens for a user (used on password change or account compromise).
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (err) {
    console.warn('[TokenService] Failed to revoke all refresh tokens for user:', err);
  }
}
