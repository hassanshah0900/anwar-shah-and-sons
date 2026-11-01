import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './client';

describe('authErrorMessage', () => {
  it('maps known error codes to friendly messages', () => {
    expect(authErrorMessage({ code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 })).toBe(
      'Incorrect email or password.',
    );
    expect(authErrorMessage({ code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', status: 422 })).toBe(
      'An account with this email already exists.',
    );
  });

  it('explains rate limiting by status', () => {
    expect(authErrorMessage({ status: 429 })).toMatch(/too many attempts/i);
  });

  it('falls back to a generic message', () => {
    expect(authErrorMessage({ code: 'SOMETHING_NEW', status: 500 })).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
