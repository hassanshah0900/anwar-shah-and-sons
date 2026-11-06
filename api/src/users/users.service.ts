import { Injectable } from '@nestjs/common';
import {
  DEFAULT_PAGE_SIZE,
  sessionUserSchema,
  type SessionUser,
  type UserList,
  type UserListQuery,
} from '@repo/shared';
import { desc } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { InjectDatabase } from '../db/database.module.js';
import { users as usersTable } from '../db/schema/index.js';

@Injectable()
export class UsersService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** Strips the session's user down to the public contract (no ban or internal fields). */
  toSessionUser(user: unknown): SessionUser {
    return sessionUserSchema.parse(user);
  }

  /** One page of users, newest first. The query is validated by the controller. */
  async list({
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  }: Partial<UserListQuery> = {}): Promise<UserList> {
    const [users, total] = await Promise.all([
      this.db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          emailVerified: usersTable.emailVerified,
          image: usersTable.image,
          role: usersTable.role,
          createdAt: usersTable.createdAt,
        })
        .from(usersTable)
        .orderBy(desc(usersTable.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.$count(usersTable),
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
