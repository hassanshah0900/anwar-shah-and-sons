import { PrismaPg } from '@prisma/adapter-pg';
import { createPrismaAdapter } from './prisma-adapter.js';

vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: vi.fn() }));

describe('createPrismaAdapter', () => {
  it('passes the schema from the connection string to the driver', () => {
    createPrismaAdapter('postgresql://u:p@localhost:5432/app?schema=e2e');

    expect(PrismaPg).toHaveBeenCalledWith(expect.anything(), { schema: 'e2e' });
  });

  it('leaves the schema unset when the URL has none', () => {
    createPrismaAdapter('postgresql://u:p@localhost:5432/app');

    expect(PrismaPg).toHaveBeenLastCalledWith(expect.anything(), { schema: undefined });
  });
});
