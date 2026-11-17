import { isApiConfigured } from '../../config/env.ts';
import type { CreateListingPayload, Listing } from '../../types/marketplace.ts';
import { apiRequest } from './client.ts';
import { API_ENDPOINTS } from './endpoints.ts';

export const listingsService = {
  async fetchListings(): Promise<Listing[] | null> {
    if (!isApiConfigured()) return null;
    return apiRequest<Listing[]>(API_ENDPOINTS.listings.list);
  },

  async createListing(payload: CreateListingPayload): Promise<Listing | null> {
    if (!isApiConfigured()) return null;
    return apiRequest<Listing>(API_ENDPOINTS.listings.create, {
      method: 'POST',
      body: payload,
    });
  },

  async toggleSaveListing(listingId: string, saved: boolean): Promise<{ saved: boolean } | null> {
    if (!isApiConfigured()) return null;
    return apiRequest<{ saved: boolean }>(API_ENDPOINTS.listings.toggleSave(listingId), {
      method: 'PATCH',
      body: { saved },
    });
  },
};
