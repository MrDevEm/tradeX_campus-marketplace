import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.ts';
import { authenticateToken } from '../middleware/auth.ts';

export const dashboardRouter = Router();

// All dashboard endpoints require authentication
dashboardRouter.use(authenticateToken);

dashboardRouter.get('/summary', dashboardController.getSummary);
dashboardRouter.get('/listings', dashboardController.getMyListings);
