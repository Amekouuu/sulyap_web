// In-app notifications, each with an e-mail copy. The e-mail goes out only after the surrounding
// transaction commits (db.afterCommit), so a rolled-back action never e-mails anyone.
import { notificationEmail } from '../lib/emails.js';
import { sendMailSafely } from '../lib/mailer.js';

// email: false when the caller already sends its own, more detailed e-mail.
export async function notify(db, { userId, type, message, email = true }) {
  const { rows } = await db.query(
    `WITH n AS (INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3))
     SELECT email, full_name FROM users WHERE user_id = $1 AND account_status = 'active'`,
    [userId, type, message],
  );
  if (!email || !rows[0]) return;
  const { email: to, full_name: fullName } = rows[0];
  const send = () => sendMailSafely({ to, ...notificationEmail({ fullName, type, message }) });
  if (db.afterCommit) db.afterCommit.push(send);
  else send();
}
