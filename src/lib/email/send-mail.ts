import type Mail from "nodemailer/lib/mailer";
import { createMailTransport, isSmtpEnabled } from "./smtp-config";

export type SendMailOptions = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Mail.Attachment[];
};

export async function sendMail(options: SendMailOptions): Promise<void> {
  if (!isSmtpEnabled()) return;

  const from = process.env.SMTP_FROM?.trim();
  if (!from) {
    console.error("[email] SMTP_FROM is missing.");
    return;
  }

  const transport = createMailTransport();
  if (!transport) {
    return;
  }

  await transport.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments,
  });
}
