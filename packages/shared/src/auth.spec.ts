import { describe, expect, it } from 'vitest';
import { roleSchema, sessionUserSchema, signUpSchema } from './auth.js';

describe('signUpSchema', () => {
  it('normalises the email and trims the name', () => {
    expect(
      signUpSchema.parse({
        name: '  Ayesha ',
        email: ' Ayesha@Example.COM ',
        password: 'secret123',
      }),
    ).toEqual({ name: 'Ayesha', email: 'ayesha@example.com', password: 'secret123' });
  });

  it('rejects short passwords with a readable message', () => {
    const result = signUpSchema.safeParse({ name: 'A', email: 'a@b.co', password: 'short' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Use at least 8 characters');
  });
});

describe('sessionUserSchema', () => {
  it('rejects unknown roles', () => {
    expect(roleSchema.safeParse('superuser').success).toBe(false);
    expect(
      sessionUserSchema.safeParse({
        id: '1',
        name: 'A',
        email: 'a@b.co',
        emailVerified: false,
        role: 'owner',
      }).success,
    ).toBe(false);
  });
});
