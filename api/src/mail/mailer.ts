/** An email ready to send: both an HTML and a plain-text body. */
export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/** Sends email through the driver chosen with EMAIL_DRIVER. */
export abstract class Mailer {
  abstract send(message: MailMessage): Promise<void>;
}
