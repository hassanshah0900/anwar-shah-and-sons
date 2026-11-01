export const SIGN_IN_PATH = '/sign-in';
export const DEFAULT_AFTER_SIGN_IN = '/account';

/**
 * Returns `value` only if it is a same-site path, so `?callbackUrl=` can't send a
 * user to another site after signing in (open redirect).
 */
export function safeCallbackUrl(
  value: string | null | undefined,
  fallback = DEFAULT_AFTER_SIGN_IN,
): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
}

export function signInUrl(returnTo: string): string {
  return `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(returnTo)}`;
}
