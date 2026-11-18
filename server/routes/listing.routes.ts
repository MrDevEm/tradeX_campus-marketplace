import { Router } from 'express';
import { listingController } from '../controllers/listing.controller.ts';
import {
  authenticateToken,
  optionalAuthenticateToken,
  requireApprovedUser,
} from '../middleware/auth.ts';
import { validateBody, validateQuery } from '../middleware/validate.ts';
import {
  createListingSchema,
  updateListingSchema,
  closeListingSchema,
  toggleSaveListingSchema,
  queryListingsSchema,
} from '../validators/marketplace.validator.ts';

export const listingRouter = Router();

// Public / optionally authenticated browsing
listingRouter.get(
  '/',
  optionalAuthenticateToken,
  validateQuery(queryListingsSchema),
  listingController.getListings
);

listingRouter.get('/:id', optionalAuthenticateToken, listingController.getListingById);

// Protected actions: requires approved student session
listingRouter.post(
  '/',
  authenticateToken,
  requireApprovedUser,
  validateBody(createListingSchema),
  listingController.createListing
);

// Protected: Owner or Admin
listingRouter.patch(
  '/:id',
  authenticateToken,
  validateBody(updateListingSchema),
  listingController.updateListing
);

listingRouter.post(
  '/:id/close',
  authenticateToken,
  validateBody(closeListingSchema),
  listingController.closeListing
);

// Toggle save directly on listing (used by frontend listings.service.ts)
listingRouter.patch(
  '/:id/save',
  authenticateToken,
  validateBody(toggleSaveListingSchema),
  listingController.toggleSave
);
