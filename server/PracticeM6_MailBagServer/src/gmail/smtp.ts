/**
 * SMTP access layer (Gmail) – uses nodemailer
 * For Gmail, using an App Password is the simplest approach for this assignment.
 */
import nodemailer from "nodemailer";
import type { ServerInfo } from "../util/config";

export type SendRequest = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(cfg: ServerInfo, req: SendRequest): Promise<{ messageId: string }> {
  const transporter = nodemailer.createTransport({
    host: cfg.gmail.smtp.host,
    port: cfg.gmail.smtp.port,
    secure: cfg.gmail.smtp.secure,
    auth: { user: cfg.gmail.user, pass: cfg.gmail.appPassword }
  });

  const info = await transporter.sendMail({
    from: req.from,
    to: req.to,
    subject: req.subject,
    text: req.text,
    html: req.html
  });

  return { messageId: info.messageId };
}
