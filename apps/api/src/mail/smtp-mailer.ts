import { createTransport, type Transporter } from 'nodemailer';
import { Mailer, type MailMessage } from './mailer.js';

export type SmtpOptions = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
};

/** Sends through any SMTP server, such as AWS SES's SMTP endpoint. */
export class SmtpMailer extends Mailer {
  private readonly transport: Transporter;

  constructor(private readonly options: SmtpOptions) {
    super();
    this.transport = createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: options.user ? { user: options.user, pass: options.password } : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.options.from, ...message });
  }
}
