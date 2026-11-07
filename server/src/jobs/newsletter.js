// Monthly newsletter: destinations newly endorsed in a calendar month, e-mailed to Registered Users
// who turned the newsletter on. Run once a month (after the 1st) by the scheduler through
// POST /api/internal/jobs/newsletter. Nothing is sent for a month with no new endorsements.
import crypto from 'node:crypto';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { newsletterEmail } from '../lib/emails.js';
import { sendMailSafely } from '../lib/mailer.js';

// Unsubscribe links carry a signature instead of a stored token, so no table is needed.
export function unsubscribeSignature(userId) {
  return crypto
    .createHmac('sha256', config.jwtSecret)
    .update(`newsletter-unsubscribe:${userId}`)
    .digest('base64url');
}
export function unsubscribeSignatureMatches(userId, signature) {
  const expected = Buffer.from(unsubscribeSignature(userId));
  const given = Buffer.from(String(signature || ''));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
export function unsubscribeUrl(userId) {
  return `${config.appUrl}/newsletter/unsubscribe?u=${userId}&t=${unsubscribeSignature(userId)}`;
}

// "YYYY-MM" of the month before today, in Philippine time.
export function previousMonth(now = new Date()) {
  const manila = new Date(now.getTime() + 8 * 3600 * 1000);
  const d = new Date(Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
}

// Months already sent by this server process, so a repeated scheduler call does not send twice.
const sentMonths = new Set();

export async function runNewsletter({ month = previousMonth(), force = false, onlyUserId } = {}) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('month must be YYYY-MM');
  if (sentMonths.has(month) && !force) return { month, skipped: 'already sent', sent: 0 };

  const { rows: destinations } = await query(
    `SELECT d.destination_id AS id, d.name, j.name AS jurisdiction,
       ARRAY(SELECT c.category_name FROM destination_categories dc
             JOIN categories c ON c.category_id = dc.category_id
             WHERE dc.destination_id = d.destination_id ORDER BY c.category_id)::text[] AS categories
     FROM destinations d
     JOIN jurisdictions j ON j.jurisdiction_id = d.jurisdiction_id
     JOIN LATERAL (
       SELECT max(el.endorsed_at) AS endorsed_at FROM endorsement_logs el
       WHERE el.destination_id = d.destination_id AND el.endorsement_status = 'endorsed'
     ) e ON true
     WHERE d.workflow_status = 'endorsed'
       AND (e.endorsed_at AT TIME ZONE 'Asia/Manila') >= ($1 || '-01')::date
       AND (e.endorsed_at AT TIME ZONE 'Asia/Manila') < (($1 || '-01')::date + interval '1 month')
     ORDER BY e.endorsed_at, d.name`,
    [month],
  );
  if (!destinations.length) return { month, destinations: 0, sent: 0 };

  const { rows: readers } = await query(
    `SELECT user_id, email, full_name FROM users
     WHERE role = 'registered_user' AND account_status = 'active' AND email_verified
       AND newsletter_opt_in AND ($1::int IS NULL OR user_id = $1)`,
    [onlyUserId ?? null],
  );
  const monthLabel = new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  let sent = 0;
  for (const reader of readers) {
    const ok = await sendMailSafely({
      to: reader.email,
      ...newsletterEmail({
        fullName: reader.full_name,
        monthLabel,
        destinations,
        unsubscribeUrl: unsubscribeUrl(reader.user_id),
      }),
    });
    if (ok) sent += 1;
  }
  if (!onlyUserId) sentMonths.add(month);
  return { month, destinations: destinations.length, recipients: readers.length, sent };
}
