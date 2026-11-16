import { isApiConfigured } from '../../config/env';
import type { DashboardSummary, Listing } from '../../types/marketplace';
import { apiRequest } from './client';
import { API_ENDPOINTS } from './endpoints';

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
