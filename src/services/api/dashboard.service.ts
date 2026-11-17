import { isApiConfigured } from '../../config/env.ts';
import type { DashboardSummary, Listing } from '../../types/marketplace.ts';
import { apiRequest } from './client.ts';
import { API_ENDPOINTS } from './endpoints.ts';

export const dashboardService = {
  async fetchSummary(): Promise<DashboardSummary | null> {
    if (!isApiConfigured()) return null;
    return apiRequest<DashboardSummary>(API_ENDPOINTS.dashboard.summary);
  },

  async fetchMyListings(): Promise<Listing[] | null> {
    if (!isApiConfigured()) return null;
    return apiRequest<Listing[]>(API_ENDPOINTS.dashboard.myListings);
  },
};
