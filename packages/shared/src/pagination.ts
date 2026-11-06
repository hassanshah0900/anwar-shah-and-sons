import { z } from 'zod';

/** Rows per page when a list doesn't ask for a size. */
export const DEFAULT_PAGE_SIZE = 25;
/** The most rows any paginated list returns at once. */
export const MAX_PAGE_SIZE = 100;

/** `page` and `pageSize` query parameters, shared by every paginated admin and account list. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
