import 'server-only';
import { dashboardSchema, type Dashboard } from '@repo/shared';
import { apiRequest } from './server';

export function getDashboard(): Promise<Dashboard> {
  return apiRequest('/api/v1/admin/dashboard', dashboardSchema);
}
