import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { WEB_ORIGIN } from './app.js';

/** An admin client for /api/v1/admin/* with the session cookie and web origin set. */
export function adminApi(app: INestApplication<App>, cookies: string[]) {
  const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, body?: object) =>
    request(app.getHttpServer())
      [method](`/api/v1/admin${path}`)
      .set('Cookie', cookies)
      .set('Origin', WEB_ORIGIN)
      .send(body);

  return {
    get: (path: string) => call('get', path),
    post: (path: string, body: object) => call('post', path, body),
    patch: (path: string, body: object) => call('patch', path, body),
    delete: (path: string) => call('delete', path),
  };
}
