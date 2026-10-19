import type { DashboardStats } from '@/types/stats';

import { apiClient } from './apiClient';

export const statsService = {
  getDashboard: (signal?: AbortSignal) => apiClient.get<DashboardStats>('/stats', { signal }),
};
