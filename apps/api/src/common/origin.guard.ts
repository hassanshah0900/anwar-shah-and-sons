import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection for the API's own routes (Better Auth guards /api/auth/*):
 * state-changing requests must carry the web app's Origin. Browsers always send
 * it on cross-site requests, so a forged form or fetch from another site fails.
 * The web app's server forwards the visitor's Origin when it calls the API.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    if (request.headers.origin === this.config.get('CORS_ORIGIN', { infer: true })) return true;

    throw new ForbiddenException('Invalid origin');
  }
}
