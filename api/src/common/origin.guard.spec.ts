import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Env } from '../config/env.js';
import { OriginGuard, SkipOriginCheck } from './origin.guard.js';

describe('OriginGuard', () => {
  const config = { get: () => 'http://localhost:3000' } as unknown as ConfigService<Env, true>;
  const guard = new OriginGuard(config, new Reflector());

  const route = () => undefined;
  class Routes {}

  const contextFor = (method: string, origin?: string, handler: () => void = route) =>
    ({
      getHandler: () => handler,
      getClass: () => Routes,
      switchToHttp: () => ({ getRequest: () => ({ method, headers: { origin } }) }),
    }) as unknown as ExecutionContext;

  it('lets safe methods through without an origin', () => {
    expect(guard.canActivate(contextFor('GET'))).toBe(true);
  });

  it('allows writes from the web origin', () => {
    expect(guard.canActivate(contextFor('POST', 'http://localhost:3000'))).toBe(true);
  });

  it('lets routes marked as server-to-server through', () => {
    const webhook = () => undefined;
    SkipOriginCheck()(webhook);
    expect(guard.canActivate(contextFor('POST', undefined, webhook))).toBe(true);
  });

  it.each([undefined, 'https://evil.example'])('rejects writes from origin %s', (origin) => {
    expect(() => guard.canActivate(contextFor('DELETE', origin))).toThrow(ForbiddenException);
  });
});
