import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  const prisma = {
    $transaction: vi.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
    user: { findMany: vi.fn(), count: vi.fn() },
  };
  let service: UsersService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
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
    prisma.user.findMany.mockResolvedValue([
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
    prisma.user.count.mockResolvedValue(1);

    const result = await service.list({ page: 3, pageSize: 10 });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 }),
    );
    expect(result).toEqual({
      users: [expect.objectContaining({ id: 'u1', createdAt: createdAt.toISOString() })],
      total: 1,
    });
  });
});
