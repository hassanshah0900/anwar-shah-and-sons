import 'server-only';
import { userListSchema, type UserList } from '@repo/shared';
import { apiRequest } from './server';

/** All users, for the admin area. The API enforces the admin role. */
export function getUsers(): Promise<UserList> {
  return apiRequest('/api/v1/users', userListSchema);
}
