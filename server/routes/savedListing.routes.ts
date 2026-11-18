import { Router } from 'express';
import { savedListingController } from '../controllers/savedListing.controller.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import { saveListingBodySchema } from '../validators/marketplace.validator.ts';

export const savedListingRouter = Router();

savedListingRouter.use(authenticateToken);

savedListingRouter.get('/', savedListingController.getSavedListings);
savedListingRouter.post(
  '/',
  validateBody(saveListingBodySchema),
  savedListingController.saveListing
);
savedListingRouter.delete('/:listingId', savedListingController.removeSavedListing);
