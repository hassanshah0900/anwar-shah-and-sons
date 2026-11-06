import { Controller, Get, Query } from '@nestjs/common';
import {
  ADMIN_ROLE,
  userListQuerySchema,
  type SessionUser,
  type UserList,
  type UserListQuery,
} from '@repo/shared';
import { Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** The signed-in user. Requires a session (global guard). */
  @Get('me')
  me(@Session() session: UserSession<Auth>): SessionUser {
    return this.usersService.toSessionUser(session.user);
  }

  /** Users, newest first, a page at a time. Admins only. */
  @Roles([ADMIN_ROLE])
  @Get()
  list(@Query(new ZodValidationPipe(userListQuerySchema)) query: UserListQuery): Promise<UserList> {
    return this.usersService.list(query);
  }
}
