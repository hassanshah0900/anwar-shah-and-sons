import { Test } from '@nestjs/testing';
import { DATABASE } from '../db/database.module.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  // Stands in for Drizzle's select().from().orderBy().limit().offset() chain.
  const rows = vi.fn();
  const limit = vi.fn();
  const offset = vi.fn();
  const query = {
    from: () => query,
    orderBy: () => query,
    limit: (value: number) => (limit(value), query),
    offset: (value: number) => (offset(value), rows()),
  };
  const db = { select: () => query, $count: vi.fn() };
  let service: UsersService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: DATABASE, useValue: db }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('exposes only public fields of the session user', () => {
    const user = service.toSessionUser({
      id: 'u1',
      name: 'Ayesha',
      email: 'ayesha@example.com',
      emailVerified: false,
      image: null,
      role: 'customer',
      banned: false,
      banReason: 'internal note',
    });

    expect(user).not.toHaveProperty('banned');
    expect(user).not.toHaveProperty('banReason');
  });

  it('caps the page size and serialises dates', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    rows.mockResolvedValue([
      {
        id: 'u1',
        name: 'Ayesha',
        email: 'ayesha@example.com',
        emailVerified: true,
        image: null,
        role: 'admin',
        createdAt,
      },
    ]);
    db.$count.mockResolvedValue(1);

    const result = await service.list({ page: 3, pageSize: 10 });

    expect(limit).toHaveBeenCalledWith(10);
    expect(offset).toHaveBeenCalledWith(20);
    expect(result).toEqual({
      users: [expect.objectContaining({ id: 'u1', createdAt: createdAt.toISOString() })],
      total: 1,
    });
  });
});
