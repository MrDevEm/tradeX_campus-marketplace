import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.ts';
import { authenticateToken, requireRole } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import {
  reviewVerificationSchema,
  updateStudentStatusSchema,
  moderationActionSchema,
} from '../validators/dev3.validator.ts';

export const adminRouter = Router();

// All admin routes require ADMIN or SUPERADMIN role
adminRouter.use(authenticateToken, requireRole('ADMIN', 'SUPERADMIN'));

// Student Verification Queue
adminRouter.get('/verifications/pending', adminController.getPendingVerifications);
adminRouter.post(
  '/verifications/:id/review',
  validateBody(reviewVerificationSchema),
  adminController.reviewVerification
);

// Student Directory
adminRouter.get('/students', adminController.getStudents);
adminRouter.patch(
  '/students/:id/status',
  validateBody(updateStudentStatusSchema),
  adminController.updateStudentStatus
);

// Moderation Reports
adminRouter.get('/reports', adminController.getReports);
adminRouter.post(
  '/reports/:id/action',
  validateBody(moderationActionSchema),
  adminController.resolveReport
);

// Audit Trail
adminRouter.get('/audit-logs', adminController.getAuditLogs);
