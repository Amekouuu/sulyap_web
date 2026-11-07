// npm run test:b7: end-to-end check of Phase B7 (notifications, e-mail copies, newsletter,
// unsubscribe) against the real database. Uses the dev outbox, so SMTP must NOT be configured.
// Test notifications are deleted; Juan's unread notices and newsletter choice are restored.
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { pool, query, withTransaction } from '../src/db/pool.js';
import { devOutbox } from '../src/lib/mailer.js';
import { runNewsletter } from '../src/jobs/newsletter.js';
import { notify } from '../src/services/notifications.js';

let failures = 0;
const server = createApp().listen(0);
const base = `http://localhost:${server.address().port}/api`;

function person() {
  let cookie = '';
  return async function call(method, path, { body } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: config.clientOrigins[0],
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = response.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    return { status: response.status, data };
  };
}
async function check(name, fn) {
  try {
    await fn();
    console.log(`  ok    ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL  ${name}\n        ${error.message}`);
  }
}
function expect(actual, expected, label) {
  if (actual !== expected)
    throw new Error(`${label}: expected ${expected}, got ${JSON.stringify(actual)}`);
}
const pause = () => new Promise((resolve) => setTimeout(resolve, 200));

if (config.smtp.host) {
  console.log('SMTP is configured; this check needs the dev outbox. Unset SMTP_HOST to run it.');
  process.exit(1);
}

const JUAN = 'juan.delacruz@example.com';
const juanRow = (
  await query('SELECT user_id, newsletter_opt_in FROM users WHERE email = $1', [JUAN])
).rows[0];
const unreadBefore = (
  await query('SELECT notification_id FROM notifications WHERE user_id = $1 AND NOT is_read', [
    juanRow.user_id,
  ])
).rows.map((r) => r.notification_id);
const juan = person();
await juan('POST', '/auth/login', {
  body: { email: JUAN, password: process.env.SEED_DEMO_PASSWORD },
});
const admin = person();
await admin('POST', '/auth/login', {
  body: { email: 'admin@sulyap.site', password: process.env.SEED_STAFF_PASSWORD },
});
const mailsTo = (email, text) => devOutbox().filter((m) => m.to === email && m.text.includes(text));

console.log('Notifications');
await check('guests cannot read notifications', async () => {
  expect((await person()('GET', '/notifications')).status, 401, 'guest');
});
await check('a notification is saved and its e-mail copy goes out after the save', async () => {
  await withTransaction((db) =>
    notify(db, { userId: juanRow.user_id, type: 'returned', message: 'B7 Test committed notice' }),
  );
  await pause();
  expect(mailsTo(JUAN, 'B7 Test committed notice').length, 1, 'e-mail copy');
  const list = await juan('GET', '/notifications');
  const found = list.data.notifications.find((n) => n.message === 'B7 Test committed notice');
  expect(found?.isRead, false, 'unread in the list');
  expect(list.data.unread >= 1, true, 'unread count');
});
await check('a rolled-back action leaves no notification and sends no e-mail', async () => {
  await withTransaction(async (db) => {
    await notify(db, { userId: juanRow.user_id, type: 'returned', message: 'B7 Test rolled back' });
    throw new Error('undo');
  }).catch(() => {});
  await pause();
  expect(mailsTo(JUAN, 'B7 Test rolled back').length, 0, 'e-mail');
  const r = await query(`SELECT 1 FROM notifications WHERE message = 'B7 Test rolled back'`);
  expect(r.rowCount, 0, 'row');
});
await check('mark one as read, filter unread, and mark all as read', async () => {
  const list = await juan('GET', '/notifications?unread=true');
  const target = list.data.notifications.find((n) => n.message === 'B7 Test committed notice');
  expect((await juan('POST', `/notifications/${target.id}/read`)).status, 204, 'mark read');
  const after = await juan('GET', '/notifications?unread=true');
  expect(
    after.data.notifications.some((n) => n.id === target.id),
    false,
    'gone from unread',
  );
  expect((await juan('POST', '/notifications/read-all')).status, 204, 'read all');
  expect((await juan('GET', '/notifications')).data.unread, 0, 'none unread');
  const me = await juan('GET', '/auth/me');
  expect(me.data.user.unreadNotifications, 0, 'bell count');
});
await check("nobody can mark someone else's notification", async () => {
  const mine = (await juan('GET', '/notifications')).data.notifications[0];
  expect((await admin('POST', `/notifications/${mine.id}/read`)).status, 404, 'admin');
});

console.log('Newsletter');
// The month of the latest endorsement, so there is something to send.
const latest = (
  await query(
    `SELECT to_char(max(endorsed_at) AT TIME ZONE 'Asia/Manila', 'YYYY-MM') AS month
     FROM endorsement_logs WHERE endorsement_status = 'endorsed'`,
  )
).rows[0].month;
let link;
await check('subscribers get the newly endorsed places with an unsubscribe link', async () => {
  await query('UPDATE users SET newsletter_opt_in = true WHERE user_id = $1', [juanRow.user_id]);
  const r = await runNewsletter({ month: latest, onlyUserId: juanRow.user_id });
  expect(r.sent, 1, `sent for ${latest}`);
  const mail = devOutbox().find((m) => m.to === JUAN && m.subject.startsWith('New in Sulyap'));
  link = new URL(mail.text.match(/https?:\/\/\S+\/newsletter\/unsubscribe\S+/)[0]);
  expect(mail.html.includes('/destinations/'), true, 'destination links');
});
await check('people who turned the newsletter off get nothing', async () => {
  await query('UPDATE users SET newsletter_opt_in = false WHERE user_id = $1', [juanRow.user_id]);
  const r = await runNewsletter({ month: latest, onlyUserId: juanRow.user_id });
  expect(r.recipients, 0, 'recipients');
});
await check('a month with no endorsements sends nothing', async () => {
  const r = await runNewsletter({ month: '2000-01', force: true });
  expect(r.sent, 0, 'sent');
  expect(r.destinations, 0, 'destinations');
});
await check('the unsubscribe link works without logging in; a forged one does not', async () => {
  await query('UPDATE users SET newsletter_opt_in = true WHERE user_id = $1', [juanRow.user_id]);
  const guest = person();
  const u = Number(link.searchParams.get('u'));
  const t = link.searchParams.get('t');
  const forged = await guest('POST', '/newsletter/unsubscribe', { body: { u: u + 1, t } });
  expect(forged.status, 400, 'forged');
  const ok = await guest('POST', '/newsletter/unsubscribe', { body: { u, t } });
  expect(ok.status, 200, 'status');
  const row = await query('SELECT newsletter_opt_in FROM users WHERE user_id = $1', [u]);
  expect(row.rows[0].newsletter_opt_in, false, 'turned off');
});
await check('the scheduler endpoint needs the job secret', async () => {
  const r = await person()('POST', '/internal/jobs/newsletter', { body: {} });
  expect(r.status, 403, 'no secret');
});

await query(`DELETE FROM notifications WHERE message LIKE 'B7 Test%'`);
await query('UPDATE notifications SET is_read = false WHERE notification_id = ANY ($1::int[])', [
  unreadBefore,
]);
await query('UPDATE users SET newsletter_opt_in = $2 WHERE user_id = $1', [
  juanRow.user_id,
  juanRow.newsletter_opt_in,
]);
server.close();
await pool.end();
console.log(
  failures ? `\n${failures} check(s) failed.` : '\nAll B7 checks passed. Test data removed.',
);
process.exitCode = failures ? 1 : 0;
