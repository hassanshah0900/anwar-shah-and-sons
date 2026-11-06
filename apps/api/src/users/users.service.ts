import { Injectable } from '@nestjs/common';
import {
  DEFAULT_PAGE_SIZE,
  sessionUserSchema,
  type SessionUser,
  type UserList,
  type UserListQuery,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Strips the session's user down to the public contract (no ban or internal fields). */
  toSessionUser(user: unknown): SessionUser {
    return sessionUserSchema.parse(user);
  }

  /** One page of users, newest first. The query is validated by the controller. */
  async list({
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  }: Partial<UserListQuery> = {}): Promise<UserList> {
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
        take: pageSize,
        skip: (page - 1) * pageSize,
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
