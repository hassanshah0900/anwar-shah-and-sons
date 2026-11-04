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
      STORE_CURRENCY: 'PKR',
      STORE_LOCALE: 'en-PK',
      SHIPPING_FLAT_RATE: 0,
      STORAGE_DRIVER: 'local',
      STORAGE_LOCAL_DIR: 'uploads',
    });
  });

  it('reads shipping amounts, treating a blank free-shipping threshold as none', () => {
    const env = validateEnv({ ...validEnv, SHIPPING_FLAT_RATE: '250', FREE_SHIPPING_OVER: '' });
    expect(env.SHIPPING_FLAT_RATE).toBe(250);
    expect(env.FREE_SHIPPING_OVER).toBeUndefined();
    expect(validateEnv({ ...validEnv, FREE_SHIPPING_OVER: '5000' }).FREE_SHIPPING_OVER).toBe(5000);
  });

  it('coerces PORT to a number', () => {
    expect(validateEnv({ ...validEnv, PORT: '8080' }).PORT).toBe(8080);
  });

  it('accepts a configured currency and normalises its case', () => {
    expect(validateEnv({ ...validEnv, STORE_CURRENCY: 'usd' }).STORE_CURRENCY).toBe('USD');
  });

  it('rejects an unknown currency', () => {
    expect(() => validateEnv({ ...validEnv, STORE_CURRENCY: 'ABC' })).toThrow(/STORE_CURRENCY/);
  });

  it('rejects a malformed locale', () => {
    expect(() => validateEnv({ ...validEnv, STORE_LOCALE: 'not a locale!' })).toThrow(
      /STORE_LOCALE/,
    );
  });

  it('requires a bucket and region for S3 storage', () => {
    expect(() => validateEnv({ ...validEnv, STORAGE_DRIVER: 's3' })).toThrow(/S3_BUCKET/);
    expect(
      validateEnv({ ...validEnv, STORAGE_DRIVER: 's3', S3_BUCKET: 'media', S3_REGION: 'eu-west-1' })
        .STORAGE_DRIVER,
    ).toBe('s3');
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
