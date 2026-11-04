import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StoreConfig } from '@repo/shared';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Env } from '../config/env.js';
import { storeConfig } from './store-config.js';

@AllowAnonymous()
@Controller('store')
export class StoreController {
  constructor(private readonly config: ConfigService<Env, true>) {}

  /** Store-wide settings the storefront needs, such as how to format prices. */
  @Get()
  get(): StoreConfig {
    return storeConfig(this.config);
  }
}
