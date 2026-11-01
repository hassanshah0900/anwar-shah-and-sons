import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { OriginGuard } from './origin.guard.js';

describe('OriginGuard', () => {
  const config = { get: () => 'http://localhost:3000' } as unknown as ConfigService<Env, true>;
  const guard = new OriginGuard(config);

  const contextFor = (method: string, origin?: string) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ method, headers: { origin } }) }),
    }) as unknown as ExecutionContext;

  it('lets safe methods through without an origin', () => {
    expect(guard.canActivate(contextFor('GET'))).toBe(true);
  });

  it('allows writes from the web origin', () => {
    expect(guard.canActivate(contextFor('POST', 'http://localhost:3000'))).toBe(true);
  });

  it.each([undefined, 'https://evil.example'])('rejects writes from origin %s', (origin) => {
    expect(() => guard.canActivate(contextFor('DELETE', origin))).toThrow(ForbiddenException);
  });
});
