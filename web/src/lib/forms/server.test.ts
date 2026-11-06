import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/server';
import { apiErrorState } from './server';

describe('apiErrorState', () => {
  const form = new FormData();

  it('shows a conflict’s message', () => {
    expect(apiErrorState(new ApiError(409, 'Sold out'), form)).toMatchObject({
      status: 'error',
      message: 'Sold out',
    });
  });

  it('shows a 503’s message, since it says what to do next', () => {
    expect(apiErrorState(new ApiError(503, 'Please try again.'), form)).toMatchObject({
      status: 'error',
      message: 'Please try again.',
    });
  });

  it.each([
    new ApiError(500, 'Internal server error'),
    new ApiError(502, 'Bad gateway'),
    new Error('The network is down'),
  ])('rethrows the unexpected: %s', (error) => {
    expect(() => apiErrorState(error, form)).toThrow(error);
  });
});
