import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * Browser auth client. Calls /api/auth/* on the web origin, which proxies to the
 * API, so session cookies stay first-party.
 */
export const authClient = createAuthClient({ plugins: [adminClient()] });

/** User-facing message for a Better Auth client error. */
export function authErrorMessage(error: { code?: string; status?: number }): string {
  if (error.status === 429) return 'Too many attempts. Please wait a moment and try again.';

  switch (error.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return 'Incorrect email or password.';
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'An account with this email already exists.';
    case 'PASSWORD_TOO_SHORT':
    case 'PASSWORD_TOO_LONG':
      return 'Choose a password between 8 and 128 characters.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
