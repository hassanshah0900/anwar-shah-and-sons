import { Controller, Get } from '@nestjs/common';
import { ADMIN_ROLE, type SessionUser, type UserList } from '@repo/shared';
import { Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** The signed-in user. Requires a session (global guard). */
  @Get('me')
  me(@Session() session: UserSession<Auth>): SessionUser {
    return this.usersService.toSessionUser(session.user);
  }

  /** All users, newest first. Admins only. */
  @Roles([ADMIN_ROLE])
  @Get()
  list(): Promise<UserList> {
    return this.usersService.list();
  }
}
