import { PrismaPg } from '@prisma/adapter-pg';
import { createPrismaAdapter } from './prisma-adapter.js';

vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: vi.fn() }));

describe('createPrismaAdapter', () => {
  it('applies the schema from the connection string to models and raw SQL', () => {
    createPrismaAdapter('postgresql://u:p@localhost:5432/app?schema=e2e');

    expect(PrismaPg).toHaveBeenCalledWith(
      expect.objectContaining({ options: '-c search_path=e2e' }),
      { schema: 'e2e' },
    );
  });

  it('leaves the schema unset when the URL has none', () => {
    createPrismaAdapter('postgresql://u:p@localhost:5432/app');

    expect(PrismaPg).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ options: expect.anything() }),
      { schema: undefined },
    );
  });

  it('refuses a schema name that is not a plain identifier', () => {
    expect(() =>
      createPrismaAdapter('postgresql://u:p@localhost:5432/app?schema=e2e%20-c%20x'),
    ).toThrow(/Invalid schema name/);
  });
});
