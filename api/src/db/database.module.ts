import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type pg from 'pg';
import type { Env } from '../config/env.js';
import { createDatabase, createPool } from './connection.js';

/** Injects the Drizzle database: `constructor(@InjectDatabase() private readonly db: Database)`. */
export const DATABASE = Symbol('DATABASE');
export const InjectDatabase = () => Inject(DATABASE);

const POOL = Symbol('POOL');

/** The application's single connection pool, shared by every query. */
@Global()
@Module({
  providers: [
    {
      provide: POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        createPool(config.get('DATABASE_URL', { infer: true })),
    },
    { provide: DATABASE, inject: [POOL], useFactory: createDatabase },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
