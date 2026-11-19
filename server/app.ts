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
import { errorHandler, AppError } from './middleware/errorHandler.ts';

export function createApp() {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);
        if (ENV.CORS_ORIGINS.includes(origin) || origin.startsWith('http://localhost:')) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive in development
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/categories', categoryRouter);
  app.use('/api/listings', listingRouter);
  app.use('/api/saved-listings', savedListingRouter);
  app.use('/api/verification', verificationRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/admin', adminRouter);

  // 404 Handler for unmatched routes
  app.use((req, res, next) => {
    next(new AppError(`Route ${req.method} ${req.path} not found.`, 404, 'NOT_FOUND'));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
