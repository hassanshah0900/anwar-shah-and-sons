import { Logger } from '@nestjs/common';
import { Mailer, type MailMessage } from './mailer.js';

/** Development driver: prints each email instead of sending it, so links can be followed. */
export class LogMailer extends Mailer {
  private readonly logger = new Logger('Mail');

  async send({ to, subject, text }: MailMessage): Promise<void> {
    this.logger.log(`To: ${to}\nSubject: ${subject}\n\n${text}`);
  }
}
