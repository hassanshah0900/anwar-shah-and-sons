import { describe, expect, it } from 'vitest';
import { safeCallbackUrl, signInUrl } from './redirect';

describe('safeCallbackUrl', () => {
  it.each(['/account', '/admin?tab=users', '/shop/women#top'])('allows the path %s', (path) => {
    expect(safeCallbackUrl(path)).toBe(path);
  });

  it.each([
    null,
    '',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
  ])('falls back for %s', (value) => {
    expect(safeCallbackUrl(value)).toBe('/account');
  });
});

describe('signInUrl', () => {
  it('encodes the return path', () => {
    expect(signInUrl('/admin?tab=users')).toBe('/sign-in?callbackUrl=%2Fadmin%3Ftab%3Dusers');
  });
});
