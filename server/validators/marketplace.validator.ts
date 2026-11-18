import { z } from 'zod';

export const createListingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  category: z.string().min(1, 'Category is required'),
  type: z.string().optional().default('SELL'),
  price: z.union([z.number(), z.string()]).transform((val) => {
    const num = Number(val);
    if (isNaN(num) || num < 0) return 0;
    return num;
  }),
  condition: z.string().optional().default('GOOD'),
  campusSpot: z.string().optional(),
  spot: z.string().optional(),
  description: z.string().optional(),
  desc: z.string().optional(),
  images: z.array(z.string()).optional(),
  img: z.string().optional(),
  imageDataUrl: z.string().optional(),
});

export const updateListingSchema = z.object({
  title: z.string().min(3).optional(),
  category: z.string().min(1).optional(),
  type: z.string().optional(),
  price: z
    .union([z.number(), z.string()])
    .transform((val) => {
      const num = Number(val);
      if (isNaN(num) || num < 0) return 0;
      return num;
    })
    .optional(),
  condition: z.string().optional(),
  campusSpot: z.string().optional(),
  spot: z.string().optional(),
  description: z.string().optional(),
  desc: z.string().optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'PENDING_SWAP', 'SOLD', 'REMOVED']).optional(),
});

export const closeListingSchema = z.object({
  reason: z.string().optional().default('SOLD'),
});

export const toggleSaveListingSchema = z.object({
  saved: z.boolean(),
});

export const saveListingBodySchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
});

export const queryListingsSchema = z.object({
  q: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  condition: z.string().optional(),
  status: z.string().optional().default('ACTIVE'),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  sort: z.enum(['newest', 'price-low', 'price-high']).optional().default('newest'),
  limit: z.string().optional().default('20'),
  cursor: z.string().optional(),
});
