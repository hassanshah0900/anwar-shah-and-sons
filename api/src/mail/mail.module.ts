import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { LogMailer } from './log-mailer.js';
import { Mailer } from './mailer.js';
import { SmtpMailer } from './smtp-mailer.js';

/** Provides Mailer backed by the driver chosen with EMAIL_DRIVER. */
@Global()
@Module({
  providers: [
    {
      provide: Mailer,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): Mailer => {
        if (config.get('EMAIL_DRIVER', { infer: true }) === 'smtp') {
          return new SmtpMailer({
            host: config.get('SMTP_HOST', { infer: true }) ?? '',
            port: config.get('SMTP_PORT', { infer: true }),
            secure: config.get('SMTP_SECURE', { infer: true }),
            user: config.get('SMTP_USER', { infer: true }),
            password: config.get('SMTP_PASSWORD', { infer: true }),
            from: config.get('EMAIL_FROM', { infer: true }),
          });
        }
        return new LogMailer();
      },
    },
  ],
  exports: [Mailer],
})
export class MailModule {}
