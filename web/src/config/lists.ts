import { MAX_PAGE_SIZE } from '@repo/shared';

/** Paginated tables (admin lists and a customer's orders). */
export const listConfig = {
  /** Choices for "Rows per page". Each must be at most MAX_PAGE_SIZE. */
  pageSizes: [10, 25, 50, MAX_PAGE_SIZE],
} as const;
