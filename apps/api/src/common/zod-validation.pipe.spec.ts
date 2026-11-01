import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ name: z.string().trim().min(1, 'Enter a name') }));

  it('returns the parsed value', () => {
    expect(pipe.transform({ name: '  Kurtas ' })).toEqual({ name: 'Kurtas' });
  });

  it('reports each issue with its path', () => {
    try {
      pipe.transform({ name: '' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        message: 'Validation failed',
        issues: [{ path: 'name', message: 'Enter a name' }],
      });
    }
  });
});
