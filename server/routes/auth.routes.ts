import { Router } from 'express';
import { authController } from '../controllers/auth.controller.ts';
import { validateBody } from '../middleware/validate.ts';
import { authenticateToken } from '../middleware/auth.ts';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendOtpSchema,
} from '../validators/auth.validator.ts';

export const authRouter = Router();

// Public routes
authRouter.post('/register', validateBody(registerSchema), authController.register);
authRouter.post('/login', validateBody(loginSchema), authController.login);
authRouter.post('/verify-email', validateBody(verifyEmailSchema), authController.verifyEmail);
authRouter.post('/verify-otp', validateBody(verifyEmailSchema), authController.verifyEmail);
authRouter.post('/resend-otp', validateBody(resendOtpSchema), authController.resendOtp);
authRouter.post('/send-otp', validateBody(resendOtpSchema), authController.resendOtp);

// Authenticated routes
authRouter.post('/logout', authController.logout);
authRouter.get('/verification-status', authenticateToken, authController.getVerificationStatus);
authRouter.get('/session', authenticateToken, authController.getSession);
