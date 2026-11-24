import { Router } from 'express';
import { authController } from '../controllers/auth.controller.ts';
import { validateBody } from '../middleware/validate.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { authRateLimiter } from '../middleware/rateLimiter.ts';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendOtpSchema,
  refreshTokenSchema,
} from '../validators/auth.validator.ts';

export const authRouter = Router();

// Public routes with brute-force / OTP flooding protection
authRouter.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);
authRouter.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
authRouter.post('/verify-email', authRateLimiter, validateBody(verifyEmailSchema), authController.verifyEmail);
authRouter.post('/verify-otp', authRateLimiter, validateBody(verifyEmailSchema), authController.verifyEmail);
authRouter.post('/resend-otp', authRateLimiter, validateBody(resendOtpSchema), authController.resendOtp);
authRouter.post('/send-otp', authRateLimiter, validateBody(resendOtpSchema), authController.resendOtp);

// Refresh token rotation (short-lived access tokens + revocable refresh tokens)
authRouter.post('/refresh', authRateLimiter, validateBody(refreshTokenSchema), authController.refreshToken);
authRouter.post('/refresh-token', authRateLimiter, validateBody(refreshTokenSchema), authController.refreshToken);

// Authenticated routes
authRouter.post('/logout', authController.logout);
authRouter.get('/verification-status', authenticateToken, authController.getVerificationStatus);
authRouter.get('/session', authenticateToken, authController.getSession);
