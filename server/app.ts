import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.ts';
import { authRouter } from './routes/auth.routes.ts';
import { healthRouter } from './routes/health.routes.ts';
import { categoryRouter } from './routes/category.routes.ts';
import { listingRouter } from './routes/listing.routes.ts';
import { savedListingRouter } from './routes/savedListing.routes.ts';
import { verificationRouter } from './routes/verification.routes.ts';
import { notificationRouter } from './routes/notification.routes.ts';
import { chatRouter } from './routes/chat.routes.ts';
import { adminRouter } from './routes/admin.routes.ts';
import { dashboardRouter } from './routes/dashboard.routes.ts';
import { uploadRouter } from './routes/upload.routes.ts';
import { errorHandler, AppError } from './middleware/errorHandler.ts';
import { globalApiRateLimiter } from './middleware/rateLimiter.ts';

export function createApp() {
  const app = express();

  // Trust reverse proxy (e.g. Render, Cloudflare) for secure cookies and accurate client IP
  app.set('trust proxy', 1);

  // HTTPS Enforcement & HTTP Security Headers
  app.use((req, res, next) => {
    // Enforce HTTPS in production environments behind reverse proxies
    if (
      process.env.NODE_ENV === 'production' &&
      req.headers['x-forwarded-proto'] &&
      req.headers['x-forwarded-proto'] !== 'https'
    ) {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }

    // Security Headers
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Strict CORS Whitelist Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., curl, mobile apps, internal health checks)
        if (!origin) return callback(null, true);

        // Check against whitelist
        if (ENV.CORS_ORIGINS.includes(origin)) {
          return callback(null, true);
        }

        // In development/test, allow localhost ports
        if (
          process.env.NODE_ENV !== 'production' &&
          (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))
        ) {
          return callback(null, true);
        }

        // In production, reject unapproved origins
        if (process.env.NODE_ENV === 'production') {
          return callback(
            new AppError(`Origin ${origin} is not allowed by CORS policy.`, 403, 'CORS_FORBIDDEN')
          );
        }

        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Refresh-Token'],
    })
  );

  // Global API Rate Limiter (100 req/min per IP)
  app.use('/api', globalApiRateLimiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Serve uploaded media statically
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // API Routes
  app.get('/', (req, res) => {
    res.redirect('/api');
  });
  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/categories', categoryRouter);
  app.use('/api/listings', listingRouter);
  app.use('/api/saved-listings', savedListingRouter);
  app.use('/api/verification', verificationRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/conversations', chatRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/upload', uploadRouter);

  // 404 Handler for unmatched routes
  app.use((req, res, next) => {
    next(new AppError(`Route ${req.method} ${req.path} not found.`, 404, 'NOT_FOUND'));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
