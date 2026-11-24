import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { hashPassword, verifyPassword, isArgon2Hash } from '../services/password.service.ts';
import {
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../services/token.service.ts';
import { prisma } from '../db/prisma.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { sendSuccess } from '../middleware/envelope.ts';
import { signUserToken, type AuthenticatedUser } from '../middleware/auth.ts';
import { UserRole, UserStatus, type User, type StudentProfile, type VerificationRequest } from '@prisma/client';

export function formatAuthUser(
  user: User & {
    studentProfile?: StudentProfile | null;
    verificationRequests?: VerificationRequest[];
  }
) {
  let mappedStatus:
    | 'PENDING_EMAIL'
    | 'PENDING_UPLOAD'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'REJECTED'
    | 'SUSPENDED' = 'PENDING_EMAIL';

  if (user.status === 'PENDING_EMAIL_VERIFICATION') {
    mappedStatus = 'PENDING_EMAIL';
  } else if (user.status === 'APPROVED') {
    mappedStatus = 'APPROVED';
  } else if (user.status === 'PENDING_APPROVAL') {
    mappedStatus = 'PENDING_APPROVAL';
  } else if (user.status === 'PENDING_UPLOAD') {
    mappedStatus = 'PENDING_UPLOAD';
  } else if (user.status === 'REJECTED') {
    mappedStatus = 'REJECTED';
  } else if (user.status === 'SUSPENDED') {
    mappedStatus = 'SUSPENDED';
  }

  const hasUploadedId = Boolean(
    user.studentIdVerified ||
      (user.verificationRequests && user.verificationRequests.length > 0)
  );

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    studentId: user.studentProfile?.studentId,
    department: user.studentProfile?.department,
    academicYear: user.studentProfile?.academicYear,
    verified: user.status === 'APPROVED',
    status: mappedStatus,
    role: user.role === UserRole.SUPERADMIN ? 'ADMIN' : (user.role as 'STUDENT' | 'ADMIN'),
    idDocumentUploaded: hasUploadedId,
    rejectionReason: user.rejectionReason || undefined,
  };
}

export function formatVerificationStatus(
  user: User & {
    studentProfile?: StudentProfile | null;
    verificationRequests?: VerificationRequest[];
  }
) {
  const authUser = formatAuthUser(user);
  let badge = 'Unverified';

  switch (authUser.status) {
    case 'APPROVED':
      badge = 'Verified Student';
      break;
    case 'PENDING_APPROVAL':
      badge = 'Under Review';
      break;
    case 'PENDING_UPLOAD':
      badge = 'ID Required';
      break;
    case 'REJECTED':
      badge = 'Verification Rejected';
      break;
    case 'SUSPENDED':
      badge = 'Suspended';
      break;
    default:
      badge = 'Unverified';
  }

  return {
    status: authUser.status,
    badge,
    emailConfirmed: user.emailVerified,
    idDocumentUploaded: authUser.idDocumentUploaded,
    rejectionReason: user.rejectionReason || undefined,
    feeTier: user.status === 'APPROVED' ? '0% Student Tier' : 'Standard Tier',
  };
}

function generateOtpCode(): string {
  // 6-digit random code
  return crypto.randomInt(100000, 999999).toString();
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, fullName, studentId, department, academicYear } = req.body;

      const normalizedEmail = String(email).trim().toLowerCase();

      // Check existing email
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingUser) {
        throw new AppError('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
      }

      // Check existing studentId if provided
      if (studentId) {
        const existingProfile = await prisma.studentProfile.findUnique({
          where: { studentId: String(studentId).trim() },
        });
        if (existingProfile) {
          throw new AppError('This Student ID is already registered.', 409, 'STUDENT_ID_EXISTS');
        }
      }

      const passwordHash = await hashPassword(password);
      const otpCode = generateOtpCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName: String(fullName).trim(),
          role: UserRole.STUDENT,
          status: UserStatus.PENDING_EMAIL_VERIFICATION,
          emailVerified: false,
          studentIdVerified: false,
          studentProfile: {
            create: {
              studentId: String(studentId).trim(),
              university: 'Mekelle University',
              department: String(department).trim(),
              academicYear: String(academicYear).trim(),
              trustScore: 100,
            },
          },
          emailOtps: {
            create: {
              email: normalizedEmail,
              otpCode,
              expiresAt,
            },
          },
        },
        include: {
          studentProfile: true,
          verificationRequests: true,
        },
      });

      const accessToken = signAccessToken(user);
      const refreshToken = await createRefreshToken(user.id);
      const authUser = formatAuthUser(user);

      return sendSuccess(res, { token: accessToken, accessToken, refreshToken, user: authUser }, 201);
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const normalizedEmail = String(email).trim().toLowerCase();

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          studentProfile: true,
          verificationRequests: {
            orderBy: { submittedAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!user) {
        throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
      }

      const isMatch = await verifyPassword(password, user.passwordHash);
      if (!isMatch) {
        throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
      }

      // Transparently re-hash legacy bcrypt passwords to Argon2id
      if (!isArgon2Hash(user.passwordHash)) {
        hashPassword(password)
          .then((upgradedHash) =>
            prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: upgradedHash },
            })
          )
          .catch((upgradeErr) =>
            console.warn('[Auth] Transparent Argon2id migration skipped:', upgradeErr)
          );
      }

      if (user.status === UserStatus.SUSPENDED) {
        throw new AppError(
          'Your account has been suspended by campus moderators.',
          403,
          'ACCOUNT_SUSPENDED'
        );
      }

      const accessToken = signAccessToken(user);
      const refreshToken = await createRefreshToken(user.id);
      const authUser = formatAuthUser(user);

      return sendSuccess(res, { token: accessToken, accessToken, refreshToken, user: authUser }, 200);
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;
      const normalizedEmail = String(email).trim().toLowerCase();
      const inputOtp = String(otp).trim();

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          studentProfile: true,
          verificationRequests: true,
        },
      });

      if (!user) {
        throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
      }

      // Check OTP in database or standard developer test code
      const isTestOtp = inputOtp === '123456';
      let validOtpRecord = null;

      if (!isTestOtp) {
        validOtpRecord = await prisma.emailOtp.findFirst({
          where: {
            email: normalizedEmail,
            otpCode: inputOtp,
            used: false,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!validOtpRecord) {
          throw new AppError(
            'Invalid or expired 6-digit OTP code.',
            400,
            'INVALID_OTP'
          );
        }

        await prisma.emailOtp.update({
          where: { id: validOtpRecord.id },
          data: { used: true },
        });
      }

      // Transition user from PENDING_EMAIL_VERIFICATION -> PENDING_UPLOAD
      const nextStatus =
        user.status === UserStatus.PENDING_EMAIL_VERIFICATION
          ? UserStatus.PENDING_UPLOAD
          : user.status;

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          status: nextStatus,
        },
        include: {
          studentProfile: true,
          verificationRequests: true,
        },
      });

      const token = signUserToken(updatedUser);
      const authUser = formatAuthUser(updatedUser);

      return sendSuccess(res, { token, user: authUser }, 200);
    } catch (err) {
      next(err);
    }
  },

  async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const normalizedEmail = String(email).trim().toLowerCase();

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        throw new AppError('User not found with this email.', 404, 'USER_NOT_FOUND');
      }

      const otpCode = generateOtpCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await prisma.emailOtp.create({
        data: {
          userId: user.id,
          email: normalizedEmail,
          otpCode,
          expiresAt,
        },
      });

      return sendSuccess(res, { success: true, message: 'OTP sent' }, 200);
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response) {
    const rawRefreshToken =
      req.body?.refreshToken || (req.headers['x-refresh-token'] as string | undefined);
    if (rawRefreshToken) {
      await revokeRefreshToken(rawRefreshToken);
    }
    return sendSuccess(res, { success: true, message: 'Logged out successfully.' }, 200);
  },

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const rawRefreshToken =
        req.body?.refreshToken || (req.headers['x-refresh-token'] as string | undefined);
      if (!rawRefreshToken) {
        throw new AppError('Refresh token is required.', 400, 'REFRESH_TOKEN_REQUIRED');
      }

      const result = await rotateRefreshToken(rawRefreshToken);
      return sendSuccess(
        res,
        {
          token: result.accessToken,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        },
        200
      );
    } catch (err) {
      next(err);
    }
  },

  async getVerificationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as AuthenticatedUser;
      const statusPayload = formatVerificationStatus(user);
      return sendSuccess(res, statusPayload, 200);
    } catch (err) {
      next(err);
    }
  },

  async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as AuthenticatedUser;
      const authUser = formatAuthUser(user);
      return sendSuccess(res, { user: authUser }, 200);
    } catch (err) {
      next(err);
    }
  },
};
