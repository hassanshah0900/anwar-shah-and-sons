import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

export type ValidationIssue = { path: string; message: string };

/**
 * Validates and transforms a request value with a Zod schema, typically one from
 * @repo/shared so the API and web validate the same way.
 *
 *   @Body(new ZodValidationPipe(categoryInputSchema)) input: CategoryInput
 */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      throw new BadRequestException({ message: 'Validation failed', issues });
    }

    return result.data;
  }
}
