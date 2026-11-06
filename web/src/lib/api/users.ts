import 'server-only';
import { userListSchema, type UserList, type UserListQuery } from '@repo/shared';
import { apiRequest } from './server';

/** A page of users, for the admin area. The API enforces the admin role. */
export function getUsers(query: Partial<UserListQuery> = {}): Promise<UserList> {
  const params = new URLSearchParams();
  if (query.page && query.page > 1) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  return apiRequest(`/api/v1/users${params.size ? `?${params}` : ''}`, userListSchema);
}
