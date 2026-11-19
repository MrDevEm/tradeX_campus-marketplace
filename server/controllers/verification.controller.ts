import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { sendSuccess } from '../middleware/envelope.ts';

export const verificationController = {
  async uploadId(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const { idDocument, idDocumentDataUrl, studentId, department, academicYear } = req.body;
      const documentUrl = idDocument || idDocumentDataUrl;

      // Update student profile if metadata provided
      if (studentId || department || academicYear) {
        await prisma.studentProfile.upsert({
          where: { userId: req.user.id },
          create: {
            userId: req.user.id,
            studentId: studentId || `ID-${Date.now().toString().slice(-6)}`,
            department: department || 'General Studies',
            academicYear: academicYear || 'Current Student',
          },
          update: {
            ...(studentId ? { studentId } : {}),
            ...(department ? { department } : {}),
            ...(academicYear ? { academicYear } : {}),
          },
        });
      }

      // Create a pending verification request
      const verification = await prisma.verificationRequest.create({
        data: {
          userId: req.user.id,
          idDocumentUrl: documentUrl,
          status: 'PENDING_APPROVAL',
        },
      });

      // Update user status to PENDING_APPROVAL
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          status: 'PENDING_APPROVAL',
          studentIdVerified: false,
          rejectionReason: null,
        },
      });

      return sendSuccess(
        res,
        {
          id: verification.id,
          userId: verification.userId,
          status: 'PENDING_APPROVAL',
          badge: 'Pending Review',
          emailConfirmed: true,
          idDocumentUploaded: true,
          rejectionReason: null,
          feeTier: '0% Student Tier',
          submittedAt: verification.submittedAt,
          idDocumentUrl: verification.idDocumentUrl,
          message: 'Student ID uploaded successfully. Awaiting campus admin approval.',
        },
        201
      );
    } catch (err) {
      next(err);
    }
  },

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const latestRequest = await prisma.verificationRequest.findFirst({
        where: { userId: req.user.id },
        orderBy: { submittedAt: 'desc' },
      });

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { studentProfile: true },
      });

      return sendSuccess(res, {
        status: user?.status || 'PENDING_EMAIL_VERIFICATION',
        studentIdVerified: user?.studentIdVerified || false,
        rejectionReason: user?.rejectionReason || latestRequest?.rejectionReason || null,
        studentProfile: user?.studentProfile || null,
        latestRequest: latestRequest
          ? {
              id: latestRequest.id,
              status: latestRequest.status,
              submittedAt: latestRequest.submittedAt,
              reviewedAt: latestRequest.reviewedAt,
              rejectionReason: latestRequest.rejectionReason,
            }
          : null,
      });
    } catch (err) {
      next(err);
    }
  },
};
