import { validateEnv } from './env.js';

const validEnv = {
  CORS_ORIGIN: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/app',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
};

describe('validateEnv', () => {
  it('applies defaults for optional variables', () => {
    expect(validateEnv(validEnv)).toEqual({
      ...validEnv,
      NODE_ENV: 'development',
      PORT: 4000,
    });
  });

  it('coerces PORT to a number', () => {
    expect(validateEnv({ ...validEnv, PORT: '8080' }).PORT).toBe(8080);
  });

  it('rejects a short BETTER_AUTH_SECRET', () => {
    expect(() => validateEnv({ ...validEnv, BETTER_AUTH_SECRET: 'too-short' })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
  });

  it('rejects a missing DATABASE_URL', () => {
    const { DATABASE_URL: _omitted, ...withoutDatabaseUrl } = validEnv;
    expect(() => validateEnv(withoutDatabaseUrl)).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-postgres DATABASE_URL', () => {
    expect(() => validateEnv({ ...validEnv, DATABASE_URL: 'mysql://localhost/app' })).toThrow(
      /DATABASE_URL/,
    );
  });
});
