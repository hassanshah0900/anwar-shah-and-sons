import { z } from 'zod';
import { sessionUserSchema } from './auth.js';

/** A user as listed in the admin area. */
export const userSummarySchema = sessionUserSchema.extend({
  createdAt: z.iso.datetime(),
});
export type UserSummary = z.infer<typeof userSummarySchema>;

export const userListSchema = z.object({
  users: z.array(userSummarySchema),
  total: z.number().int().nonnegative(),
});
export type UserList = z.infer<typeof userListSchema>;
