import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SKIP_ORIGIN_CHECK = 'skipOriginCheck';

/** For server-to-server routes that prove who's calling another way, like a signed webhook. */
export const SkipOriginCheck = () => SetMetadata(SKIP_ORIGIN_CHECK, true);

/**
 * CSRF protection for the API's own routes (Better Auth guards /api/auth/*):
 * state-changing requests must carry the web app's Origin. Browsers always send
 * it on cross-site requests, so a forged form or fetch from another site fails.
 * The web app's server forwards the visitor's Origin when it calls the API.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;
    if (
      this.reflector.getAllAndOverride<boolean>(SKIP_ORIGIN_CHECK, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    if (request.headers.origin === this.config.get('CORS_ORIGIN', { infer: true })) return true;

    throw new ForbiddenException('Invalid origin');
  }
}
