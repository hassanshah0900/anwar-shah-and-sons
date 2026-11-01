import { Injectable } from '@nestjs/common';
import { sessionUserSchema, type SessionUser, type UserList } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service.js';

const MAX_PAGE_SIZE = 100;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Strips the session's user down to the public contract (no ban or internal fields). */
  toSessionUser(user: unknown): SessionUser {
    return sessionUserSchema.parse(user);
  }

  async list({ take = 50, skip = 0 } = {}): Promise<UserList> {
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(take, MAX_PAGE_SIZE),
        skip,
      }),
      this.prisma.user.count(),
    ]);

    return {
      users: users.map((user) => ({
        ...this.toSessionUser(user),
        createdAt: user.createdAt.toISOString(),
      })),
      total,
    };
  }
}
