import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { LocalStorageService } from './local-storage.service.js';
import { S3StorageService } from './s3-storage.service.js';
import { StorageService } from './storage.js';

/** Provides StorageService backed by the driver chosen with STORAGE_DRIVER. */
@Global()
@Module({
  providers: [
    {
      provide: StorageService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): StorageService => {
        if (config.get('STORAGE_DRIVER', { infer: true }) === 's3') {
          return new S3StorageService({
            bucket: config.get('S3_BUCKET', { infer: true }) ?? '',
            region: config.get('S3_REGION', { infer: true }) ?? '',
            endpoint: config.get('S3_ENDPOINT', { infer: true }),
          });
        }
        return new LocalStorageService(config.get('STORAGE_LOCAL_DIR', { infer: true }));
      },
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
