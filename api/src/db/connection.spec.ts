import { createPool, schemaFromUrl } from './connection.js';

describe('schemaFromUrl', () => {
  it('reads the schema from the connection string', () => {
    expect(schemaFromUrl('postgresql://u:p@localhost:5432/app?schema=e2e')).toBe('e2e');
  });

  it('is undefined when the URL has none', () => {
    expect(schemaFromUrl('postgresql://u:p@localhost:5432/app')).toBeUndefined();
  });

  it('refuses a schema name that is not a plain identifier', () => {
    expect(() => schemaFromUrl('postgresql://u:p@localhost:5432/app?schema=e2e%20-c%20x')).toThrow(
      /Invalid schema name/,
    );
  });
});

describe('createPool', () => {
  it('points the search path at the schema from the URL', async () => {
    const pool = createPool('postgresql://u:p@localhost:5432/app?schema=e2e');
    expect(pool.options).toMatchObject({ options: '-c search_path=e2e' });
    await pool.end();
  });

  it('leaves the search path alone when the URL has no schema', async () => {
    const pool = createPool('postgresql://u:p@localhost:5432/app');
    expect(pool.options).not.toHaveProperty('options');
    await pool.end();
  });
});
