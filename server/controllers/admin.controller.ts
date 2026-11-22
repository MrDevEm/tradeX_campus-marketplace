import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { sendSuccess } from '../middleware/envelope.ts';
import { broadcastToUser } from '../realtime/gateway.ts';

export const adminController = {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const [pendingVerifications, openReports, totalStudents, totalListings] = await Promise.all([
        prisma.verificationRequest.count({ where: { status: 'PENDING_APPROVAL' } }),
        prisma.moderationReport.count({ where: { status: 'OPEN' } }),
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.listing.count({ where: { status: 'ACTIVE' } }),
      ]);
      return sendSuccess(res, {
        pendingVerifications,
        openReports,
        totalStudents,
        totalListings,
      });
    } catch (err) {
      next(err);
    }
  },

  async getPendingVerifications(req: Request, res: Response, next: NextFunction) {
    try {
      const requests = await prisma.verificationRequest.findMany({
        where: { status: 'PENDING_APPROVAL' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              status: true,
              createdAt: true,
              studentProfile: true,
            },
          },
        },
        orderBy: { submittedAt: 'asc' },
      });

      return sendSuccess(res, requests, 200, { total: requests.length });
    } catch (err) {
      next(err);
    }
  },

  async reviewVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { action, rejectionReason, notes } = req.body;

      const verification = await prisma.verificationRequest.findUnique({
        where: { id: String(id) },
        include: { user: true },
      });

      if (!verification) {
        throw new AppError('Verification request not found.', 404, 'NOT_FOUND');
      }

      const isApprove = action === 'APPROVE';
      const newStatus = isApprove ? 'APPROVED' : 'REJECTED';

      const updatedRequest = await prisma.verificationRequest.update({
        where: { id: String(id) },
        data: {
          status: newStatus,
          rejectionReason: isApprove ? null : (rejectionReason || 'Document could not be verified.'),
          reviewedBy: req.user?.id,
          reviewedAt: new Date(),
        },
      });

      await prisma.user.update({
        where: { id: verification.userId },
        data: {
          status: newStatus,
          studentIdVerified: isApprove,
          rejectionReason: isApprove ? null : (rejectionReason || 'Document could not be verified.'),
        },
      });

      // Create Audit Log
      await prisma.auditLog.create({
        data: {
          actorId: req.user?.id || 'system-admin',
          actorName: req.user?.fullName || 'Campus Moderator',
          action: isApprove ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
          targetType: 'STUDENT',
          targetName: verification.user.fullName,
          notes: notes || rejectionReason || (isApprove ? 'Manual student ID card verified.' : 'Verification rejected.'),
        },
      });

      // Send In-App Notification
      const notif = await prisma.campusNotification.create({
        data: {
          userId: verification.userId,
          type: 'VERIFICATION',
          title: isApprove ? 'Student Identity Verified' : 'Verification Action Needed',
          message: isApprove
            ? 'Your campus ID has been verified! You can now post listings and contact sellers.'
            : `Your verification was rejected: ${rejectionReason || 'Please upload a clear student ID card.'}`,
          entityId: String(id),
        },
      });

      // Real-time WebSocket notifications
      broadcastToUser(verification.userId, 'verification-updated', {
        status: newStatus,
        badge: isApprove ? 'Verified Student' : null,
      });

      broadcastToUser(verification.userId, 'new-notification', {
        id: notif.id,
        type: 'VERIFICATION',
        title: notif.title,
        message: notif.message,
        entityId: String(id),
        createdAt: notif.createdAt,
      });

      return sendSuccess(res, {
        success: true,
        verification: updatedRequest,
        message: isApprove ? 'Student approved successfully.' : 'Verification rejected.',
      });
    } catch (err) {
      next(err);
    }
  },

  async getStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, status, department } = req.query;

      const whereClause: Record<string, unknown> = {
        role: 'STUDENT',
      };

      if (status) {
        whereClause.status = String(status);
      }

      if (q) {
        whereClause.OR = [
          { fullName: { contains: String(q), mode: 'insensitive' } },
          { email: { contains: String(q), mode: 'insensitive' } },
        ];
      }

      if (department) {
        whereClause.studentProfile = {
          department: { contains: String(department), mode: 'insensitive' },
        };
      }

      const students = await prisma.user.findMany({
        where: whereClause,
        include: {
          studentProfile: true,
          _count: {
            select: { listings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(res, students, 200, { total: students.length });
    } catch (err) {
      next(err);
    }
  },

  async updateStudentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const student = await prisma.user.findUnique({
        where: { id: String(id) },
      });

      if (!student) {
        throw new AppError('Student not found.', 404, 'NOT_FOUND');
      }

      const updated = await prisma.user.update({
        where: { id: String(id) },
        data: {
          status,
          ...(reason ? { rejectionReason: reason } : {}),
        },
      });

      // If suspended, soft-remove active listings
      if (status === 'SUSPENDED') {
        await prisma.listing.updateMany({
          where: { sellerId: String(id), status: 'ACTIVE' },
          data: { status: 'REMOVED' },
        });
      }

      // Create Audit Log
      await prisma.auditLog.create({
        data: {
          actorId: req.user?.id || 'system-admin',
          actorName: req.user?.fullName || 'Campus Moderator',
          action: status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_STATUS_UPDATED',
          targetType: 'USER',
          targetName: student.fullName,
          notes: reason || `Status changed to ${status}`,
        },
      });

      return sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },

  async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query;

      const reports = await prisma.moderationReport.findMany({
        where: status ? { status: status as 'OPEN' | 'RESOLVED' | 'DISMISSED' } : undefined,
        include: {
          reporter: {
            select: { id: true, fullName: true, email: true },
          },
          reportedUser: {
            select: { id: true, fullName: true, email: true },
          },
          listing: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(res, reports, 200, { total: reports.length });
    } catch (err) {
      next(err);
    }
  },

  async resolveReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { action, resolutionNote } = req.body;

      const report = await prisma.moderationReport.findUnique({
        where: { id: String(id) },
        include: { listing: true, reportedUser: true },
      });

      if (!report) {
        throw new AppError('Report not found.', 404, 'NOT_FOUND');
      }

      // Execute moderation action
      if (action === 'REMOVE_LISTING' && report.listingId) {
        await prisma.listing.update({
          where: { id: report.listingId },
          data: { status: 'REMOVED' },
        });
      } else if (action === 'SUSPEND_USER' && report.reportedUserId) {
        await prisma.user.update({
          where: { id: report.reportedUserId },
          data: { status: 'SUSPENDED' },
        });
        await prisma.listing.updateMany({
          where: { sellerId: report.reportedUserId, status: 'ACTIVE' },
          data: { status: 'REMOVED' },
        });
      }

      const isDismissed = action === 'DISMISS';
      const updated = await prisma.moderationReport.update({
        where: { id: String(id) },
        data: {
          status: isDismissed ? 'DISMISSED' : 'RESOLVED',
          actionTaken: action,
          resolutionNote: resolutionNote || null,
          resolvedBy: req.user?.id,
          resolvedAt: new Date(),
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          actorId: req.user?.id || 'system-admin',
          actorName: req.user?.fullName || 'Campus Moderator',
          action: `REPORT_${action}`,
          targetType: report.targetType,
          targetName: report.listing?.title || report.reportedUser?.fullName || 'Item',
          notes: resolutionNote || `Report ${action.toLowerCase()} executed.`,
        },
      });

      return sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },

  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      return sendSuccess(res, logs, 200, { total: logs.length });
    } catch (err) {
      next(err);
    }
  },

  async getAdmins(req: Request, res: Response, next: NextFunction) {
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(res, admins, 200, { total: admins.length });
    } catch (err) {
      next(err);
    }
  },

  async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, fullName, role } = req.body;
      if (!email || !password || !fullName) {
        throw new AppError('Email, password, and full name are required.', 400, 'VALIDATION_ERROR');
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing) {
        throw new AppError('An account with this email address already exists.', 409, 'CONFLICT');
      }

      const passwordHash = await bcrypt.hash(String(password), 10);
      const assignedRole = role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN';

      const newAdmin = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName: String(fullName).trim(),
          role: assignedRole,
          status: 'APPROVED',
          emailVerified: true,
          studentIdVerified: true,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.user?.id || 'admin',
          actorName: req.user?.fullName || 'Campus Administrator',
          action: 'ADMIN_PROVISIONED',
          targetType: 'USER',
          targetName: newAdmin.email,
          notes: `Created staff admin account for ${newAdmin.fullName} (${assignedRole}).`,
        },
      });

      return sendSuccess(res, newAdmin, 201, { message: 'Campus admin account created successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async updateCredentials(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUserId = req.user?.id;
      const { email, currentPassword, newPassword } = req.body;

      if (!currentUserId) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const user = await prisma.user.findUnique({
        where: { id: currentUserId },
      });
      if (!user) {
        throw new AppError('User account not found.', 404, 'NOT_FOUND');
      }

      let updatedPasswordHash = user.passwordHash;
      if (currentPassword && newPassword) {
        const isMatch = await bcrypt.compare(String(currentPassword), user.passwordHash);
        if (!isMatch) {
          throw new AppError('Current password is incorrect.', 400, 'INVALID_PASSWORD');
        }
        if (String(newPassword).length < 6) {
          throw new AppError('New password must be at least 6 characters long.', 400, 'WEAK_PASSWORD');
        }
        updatedPasswordHash = await bcrypt.hash(String(newPassword), 10);
      }

      let updatedEmail = user.email;
      if (email && email.trim().toLowerCase() !== user.email) {
        const normalized = email.trim().toLowerCase();
        const existing = await prisma.user.findUnique({ where: { email: normalized } });
        if (existing && existing.id !== currentUserId) {
          throw new AppError('Email address is already in use by another account.', 409, 'CONFLICT');
        }
        updatedEmail = normalized;
      }

      const updated = await prisma.user.update({
        where: { id: currentUserId },
        data: {
          email: updatedEmail,
          passwordHash: updatedPasswordHash,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: currentUserId,
          actorName: updated.fullName,
          action: 'STAFF_CREDENTIALS_UPDATED',
          targetType: 'USER',
          targetName: updated.email,
          notes: 'Updated staff administrator email or password security credentials.',
        },
      });

      return sendSuccess(res, updated, 200, { message: 'Admin credentials updated successfully.' });
    } catch (err) {
      next(err);
    }
  },
};
