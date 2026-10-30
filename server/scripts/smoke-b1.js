// npm run test:b1: end-to-end check of Phase B1 against the real database and storage.
// Creates a throwaway account (b1.tester@example.com), runs the whole sign-up and ID flow,
// and deletes the account at the end. Needs the base seed and SEED_STAFF_PASSWORD.
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { pool, query } from '../src/db/pool.js';
import { devOutbox } from '../src/lib/mailer.js';
import { runIdCleanup } from '../src/jobs/idCleanup.js';

const TESTER = 'b1.tester@example.com';
const ORIGIN = config.clientOrigins[0];
let failures = 0;

const server = createApp().listen(0);
const base = `http://localhost:${server.address().port}/api`;

// A tiny browser: keeps one cookie jar per person.
function person() {
  let cookie = '';
  return async function call(method, path, { body, form, headers = {} } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: ORIGIN,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: form || (body ? JSON.stringify(body) : undefined),
    });
    const set = response.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
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

// 1x1 PNG and a fake GIF, built in memory.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const GIF = Buffer.from('R0lGODlhAQABAAAAACw=', 'base64');
function idForm(buffer, name, type, idType = 'UMID') {
  const form = new FormData();
  form.append('idType', idType);
  form.append('photo', new Blob([buffer], { type }), name);
  return form;
}

await query('DELETE FROM users WHERE email = $1', [TESTER]);
const user = person();
const admin = person();
const guest = person();

console.log('Sign-up and e-mail verification');
await check('sign-up creates an account and signs in', async () => {
  const r = await user('POST', '/auth/register', {
    body: {
      fullName: 'B1 Tester',
      email: TESTER,
      contactNumber: '0917 555 0000',
      password: 'testpass123',
      acceptTerms: true,
    },
  });
  expect(r.status, 201, 'status');
  expect(r.data.user.verification, 'email_unverified', 'state');
});
await check('sign-up refuses a duplicate e-mail', async () => {
  const r = await guest('POST', '/auth/register', {
    body: {
      fullName: 'Dup',
      email: TESTER.toUpperCase(),
      contactNumber: '09175550000',
      password: 'testpass123',
      acceptTerms: true,
    },
  });
  expect(r.status, 409, 'status');
});
await check('sign-up needs the Terms box', async () => {
  const r = await guest('POST', '/auth/register', {
    body: {
      fullName: 'No Terms',
      email: 'x1@example.com',
      contactNumber: '09175550000',
      password: 'testpass123',
      acceptTerms: false,
    },
  });
  expect(r.status, 400, 'status');
});
await check('ID upload is blocked before e-mail verification', async () => {
  const r = await user('POST', '/account/id', { form: idForm(PNG, 'id.png', 'image/png') });
  expect(r.status, 403, 'status');
});
const mail = devOutbox().find((m) => m.to === TESTER);
const token = mail?.text.match(/token=([\w-]+)/)?.[1];
await check('a verification e-mail with a link was sent', async () =>
  expect(Boolean(token), true, 'token found'),
);
await check('a wrong link is refused', async () => {
  expect(
    (await guest('POST', '/auth/verify-email', { body: { token: 'not-a-real-token-123' } })).status,
    400,
    'status',
  );
});
await check('the link verifies the e-mail', async () => {
  expect(
    (await guest('POST', '/auth/verify-email', { body: { token } })).data.status,
    'verified',
    'result',
  );
  expect((await user('GET', '/auth/me')).data.user.verification, 'no_id', 'state');
});
await check('opening the link again says already verified', async () => {
  expect(
    (await guest('POST', '/auth/verify-email', { body: { token } })).data.status,
    'already_verified',
    'result',
  );
});

console.log('ID upload and admin decision');
await check('a GIF is refused', async () => {
  expect(
    (await user('POST', '/account/id', { form: idForm(GIF, 'id.gif', 'image/gif') })).status,
    400,
    'status',
  );
});
await check('a PNG ID uploads and waits for review', async () => {
  const r = await user('POST', '/account/id', { form: idForm(PNG, 'id.png', 'image/png') });
  expect(r.status, 200, 'status');
  expect(r.data.user.verification, 'pending', 'state');
});
await check('guests and registered users cannot open admin pages', async () => {
  expect((await guest('GET', '/admin/users')).status, 401, 'guest');
  expect((await user('GET', '/admin/users')).status, 403, 'registered user');
});
await check('admin logs in', async () => {
  const r = await admin('POST', '/auth/login', {
    body: { email: 'admin@sulyap.site', password: process.env.SEED_STAFF_PASSWORD },
  });
  expect(r.status, 200, 'status');
});
const testerId = (await query('SELECT user_id FROM users WHERE email = $1', [TESTER])).rows[0]
  ?.user_id;
await check('the pending ID is listed with a working image link', async () => {
  const list = await admin('GET', '/admin/id-verifications?status=pending');
  expect(
    list.data.records.some((r) => r.userId === testerId),
    true,
    'listed',
  );
  const detail = await admin('GET', `/admin/id-verifications/${testerId}`);
  expect(Boolean(detail.data.imageUrl), true, 'signed link');
  expect((await fetch(detail.data.imageUrl)).status, 200, 'image download');
});
await check('rejecting needs a reason', async () => {
  const r = await admin('POST', `/admin/id-verifications/${testerId}/decision`, {
    body: { decision: 'rejected' },
  });
  expect(r.status, 400, 'status');
});
await check('reject with a reason; the user sees it', async () => {
  const r = await admin('POST', `/admin/id-verifications/${testerId}/decision`, {
    body: { decision: 'rejected', reason: 'The photo is blurry. Please upload a clearer one.' },
  });
  expect(r.status, 200, 'status');
  const me = (await user('GET', '/auth/me')).data.user;
  expect(me.verification, 'rejected', 'state');
  expect(me.verificationNote.includes('blurry'), true, 'reason shown');
});
await check('a decided ID cannot be decided twice', async () => {
  const r = await admin('POST', `/admin/id-verifications/${testerId}/decision`, {
    body: { decision: 'verified' },
  });
  expect(r.status, 409, 'status');
});
await check('re-upload, verify, and the user can contribute', async () => {
  expect(
    (await user('POST', '/account/id', { form: idForm(PNG, 'id2.png', 'image/png') })).status,
    200,
    'upload',
  );
  expect(
    (
      await admin('POST', `/admin/id-verifications/${testerId}/decision`, {
        body: { decision: 'verified' },
      })
    ).status,
    200,
    'verify',
  );
  expect((await user('GET', '/auth/me')).data.user.canContribute, true, 'can contribute');
});
await check('ID photo is deleted 24 hours after the decision', async () => {
  await query(`UPDATE users SET verified_at = now() - interval '25 hours' WHERE user_id = $1`, [
    testerId,
  ]);
  await runIdCleanup(() => {});
  const { rows } = await query(
    'SELECT id_document_url, account_verification_status, id_type FROM users WHERE user_id = $1',
    [testerId],
  );
  expect(rows[0].id_document_url, null, 'image reference');
  expect(rows[0].account_verification_status, 'verified', 'status kept');
  expect(rows[0].id_type, 'UMID', 'ID type kept');
});

console.log('Accounts, passwords, and protections');
await check('admin suspends the user; the session ends and login is refused', async () => {
  expect(
    (await admin('PATCH', `/admin/users/${testerId}/status`, { body: { status: 'suspended' } }))
      .status,
    200,
    'suspend',
  );
  expect((await user('GET', '/auth/me')).data.user, null, 'signed out');
  expect(
    (await user('POST', '/auth/login', { body: { email: TESTER, password: 'testpass123' } }))
      .status,
    403,
    'login',
  );
  expect(
    (await admin('PATCH', `/admin/users/${testerId}/status`, { body: { status: 'active' } }))
      .status,
    200,
    'reactivate',
  );
});
await check('change password: wrong current refused, then new one works', async () => {
  await user('POST', '/auth/login', { body: { email: TESTER, password: 'testpass123' } });
  expect(
    (
      await user('POST', '/account/password', {
        body: { currentPassword: 'nope1234', newPassword: 'newpass456' },
      })
    ).status,
    400,
    'wrong current',
  );
  expect(
    (
      await user('POST', '/account/password', {
        body: { currentPassword: 'testpass123', newPassword: 'newpass456' },
      })
    ).status,
    204,
    'changed',
  );
  expect(
    (await guest('POST', '/auth/login', { body: { email: TESTER, password: 'newpass456' } }))
      .status,
    200,
    'new login',
  );
});
await check('officer jurisdictions can be changed and need at least one', async () => {
  const officer = (
    await query(`SELECT user_id FROM users WHERE email = 'lto.mabalacat@example.com'`)
  ).rows[0];
  if (!officer) throw new Error('demo seed (test officers) not loaded');
  const before = await admin('GET', `/admin/officers/${officer.user_id}/jurisdictions`);
  expect(
    (
      await admin('PUT', `/admin/officers/${officer.user_id}/jurisdictions`, {
        body: { jurisdictionIds: [] },
      })
    ).status,
    400,
    'empty',
  );
  const two = before.data.jurisdictions
    .filter((j) => ['Mabalacat City', 'Angeles City'].includes(j.name))
    .map((j) => j.id);
  expect(
    (
      await admin('PUT', `/admin/officers/${officer.user_id}/jurisdictions`, {
        body: { jurisdictionIds: two },
      })
    ).status,
    200,
    'two',
  );
  expect(
    (
      await admin('PUT', `/admin/officers/${officer.user_id}/jurisdictions`, {
        body: { jurisdictionIds: before.data.assigned },
      })
    ).status,
    200,
    'restored',
  );
});
await check('requests from other websites are blocked', async () => {
  const r = await guest('POST', '/auth/login', {
    body: { email: TESTER, password: 'x' },
    headers: { Origin: 'https://evil.example' },
  });
  expect(r.status, 403, 'status');
});
await check('the cleanup job needs its secret', async () => {
  expect((await guest('POST', '/internal/jobs/id-cleanup')).status, 403, 'no secret');
  expect(
    (
      await guest('POST', '/internal/jobs/id-cleanup', {
        headers: { 'x-cron-secret': config.cronSecret },
      })
    ).status,
    200,
    'with secret',
  );
});

await query('DELETE FROM users WHERE email = $1', [TESTER]);
server.close();
await pool.end();
console.log(
  failures ? `\n${failures} check(s) failed.` : '\nAll B1 checks passed. Test account removed.',
);
process.exitCode = failures ? 1 : 0;
