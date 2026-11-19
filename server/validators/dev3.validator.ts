import { z } from 'zod';

export const uploadIdSchema = z.object({
  idDocument: z.string().min(1, 'Student ID document is required'),
  studentId: z.string().optional(),
  department: z.string().optional(),
  academicYear: z.string().optional(),
});

export const createConversationSchema = z.object({
  listingId: z.string().uuid('Valid listing ID is required').or(z.string().min(1)),
});

export const sendMessageSchema = z.object({
  text: z.string().min(1, 'Message text cannot be empty'),
  isMeetupProposal: z.boolean().optional(),
  meetupSpotId: z.string().optional(),
});

export const reviewVerificationSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
  notes: z.string().optional(),
});

export const updateStudentStatusSchema = z.object({
  status: z.enum(['APPROVED', 'SUSPENDED', 'REJECTED']),
  reason: z.string().optional(),
});

export const moderationActionSchema = z.object({
  action: z.enum(['REMOVE_LISTING', 'WARN_USER', 'SUSPEND_USER', 'DISMISS']),
  resolutionNote: z.string().optional(),
});
