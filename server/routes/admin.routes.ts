import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.ts';
import { authenticateToken, requireRole } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import {
  reviewVerificationSchema,
  updateStudentStatusSchema,
  moderationActionSchema,
} from '../validators/dev3.validator.ts';
import {
  createAdminSchema,
  updateCredentialsSchema,
} from '../validators/admin.validator.ts';

export const adminRouter = Router();

// All admin routes require ADMIN or SUPERADMIN role
adminRouter.use(authenticateToken, requireRole('ADMIN', 'SUPERADMIN'));

// Admin Dashboard Summary
adminRouter.get('/summary', adminController.getSummary);

// Student Verification Queue (both /verifications and /verifications/pending supported)
adminRouter.get('/verifications', adminController.getPendingVerifications);
adminRouter.get('/verifications/pending', adminController.getPendingVerifications);
adminRouter.post(
  '/verifications/:id/review',
  validateBody(reviewVerificationSchema),
  adminController.reviewVerification
);
adminRouter.post('/verifications/:id/approve', (req, res, next) => {
  req.body = { action: 'APPROVE', notes: req.body?.notes };
  adminController.reviewVerification(req, res, next);
});
adminRouter.post('/verifications/:id/reject', (req, res, next) => {
  req.body = { action: 'REJECT', rejectionReason: req.body?.reason || req.body?.rejectionReason };
  adminController.reviewVerification(req, res, next);
});

// Student Directory
adminRouter.get('/students', adminController.getStudents);
adminRouter.patch(
  '/students/:id/status',
  validateBody(updateStudentStatusSchema),
  adminController.updateStudentStatus
);

// Moderation Reports (both /reports/:id/action and /reports/:id/resolve supported)
adminRouter.get('/reports', adminController.getReports);
adminRouter.post(
  '/reports/:id/action',
  validateBody(moderationActionSchema),
  adminController.resolveReport
);
adminRouter.post('/reports/:id/resolve', (req, res, next) => {
  req.body = {
    action: req.body?.action || 'REMOVE_LISTING',
    resolutionNote: req.body?.notes || req.body?.resolutionNote,
  };
  adminController.resolveReport(req, res, next);
});

// Audit Trail
adminRouter.get('/audit-logs', adminController.getAuditLogs);

// Platform Settings & Admin Management
adminRouter.get('/settings/admins', adminController.getAdmins);
adminRouter.post('/settings/admins', validateBody(createAdminSchema), adminController.createAdmin);
adminRouter.patch('/settings/credentials', validateBody(updateCredentialsSchema), adminController.updateCredentials);
