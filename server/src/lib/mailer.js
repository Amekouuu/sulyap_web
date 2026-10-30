// Sends e-mail through SMTP. Without SMTP settings (local development), messages are kept in a
// small in-memory "outbox" instead, which the dev-only /api/dev/outbox page lists.
import nodemailer from 'nodemailer';
import { config, isProduction } from '../config.js';

const outbox = [];
const OUTBOX_LIMIT = 50;

const transport = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

export async function sendMail({ to, subject, text, html }) {
  if (transport) {
    await transport.sendMail({ from: config.smtp.from, to, subject, text, html });
    return;
  }
  if (isProduction) throw new Error('SMTP is not configured, so e-mail cannot be sent.');
  outbox.unshift({
    id: Date.now() + Math.random(),
    to,
    subject,
    text,
    html,
    sentAt: new Date().toISOString(),
  });
  outbox.length = Math.min(outbox.length, OUTBOX_LIMIT);
  console.log(`[dev outbox] to ${to}: ${subject}`);
}

export function devOutbox() {
  return outbox;
}

// E-mail is a convenience copy; a failed send should not undo the action that caused it.
export async function sendMailSafely(message) {
  try {
    await sendMail(message);
    return true;
  } catch (error) {
    console.error(`E-mail to ${message.to} failed: ${error.message}`);
    return false;
  }
}
