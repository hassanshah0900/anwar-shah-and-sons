import { z } from 'zod';

export const healthStatusSchema = z.enum(['ok', 'error']);

export const healthResponseSchema = z.object({
  status: healthStatusSchema,
  checks: z.record(
    z.string(),
    z.object({
      status: z.enum(['up', 'down']),
    }),
  ),
  timestamp: z.iso.datetime(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
