// npm run test:b4: end-to-end check of Phase B4 (administrator screening, moderation, reports,
// screening lists) against the real database. Creates its own test records and deletes them.
// Needs: base seed, demo seed, screening lists, SEED_STAFF_PASSWORD and SEED_DEMO_PASSWORD.
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { pool, query } from '../src/db/pool.js';
import { deletePhoto } from '../src/lib/storage.js';

const ORIGIN = config.clientOrigins[0];
let failures = 0;
const made = { destinations: [], reviews: [], reports: [], terms: [] };

const server = createApp().listen(0);
const base = `http://localhost:${server.address().port}/api`;

function person() {
  let cookie = '';
  return async function call(method, path, { body, form } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: ORIGIN,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: form || (body ? JSON.stringify(body) : undefined),
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

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const photoForm = () => {
  const form = new FormData();
  form.append('photos', new Blob([PNG], { type: 'image/png' }), 'p.png');
  return form;
};
const login = async (who, email, password) =>
  who('POST', '/auth/login', { body: { email, password } });

const admin = person();
const juan = person();
const officer = person();
await login(admin, 'admin@sulyap.site', process.env.SEED_STAFF_PASSWORD);
await login(juan, 'juan.delacruz@example.com', process.env.SEED_DEMO_PASSWORD);
await login(officer, 'lto.main@sulyap.site', process.env.SEED_STAFF_PASSWORD);
const porac = (await query(`SELECT jurisdiction_id FROM jurisdictions WHERE name = 'Porac'`))
  .rows[0].jurisdiction_id;
const PIN = { jurisdictionId: porac, latitude: 15.0719, longitude: 120.5419 };

// A submitted nomination by Juan, ready for screening.
async function submitted(name) {
  const r = await juan('POST', '/nominations', {
    body: {
      name,
      ...PIN,
      location: 'Brgy. Test, Porac',
      description: 'A test place made by the B4 check. It will be deleted at the end.',
      categories: ['Leisure'],
      operatingHours: 'Daily',
    },
  });
  made.destinations.push(r.data.id);
  await juan('POST', `/nominations/${r.data.id}/photos`, { form: photoForm() });
  await juan('POST', `/nominations/${r.data.id}/submit`, { body: { confirmWarnings: true } });
  return r.data.id;
}
// An endorsed destination Juan has not reviewed (removed reviews do not count).
async function unreviewed() {
  const { rows } = await query(
    `SELECT d.destination_id FROM destinations d WHERE d.workflow_status = 'endorsed'
       AND NOT EXISTS (SELECT 1 FROM reviews r JOIN users u USING (user_id)
                       WHERE r.destination_id = d.destination_id AND u.email = 'juan.delacruz@example.com'
                         AND r.moderation_status <> 'removed')
     LIMIT 1`,
  );
  return rows[0]?.destination_id;
}

console.log('Access');
await check('only administrators can open the admin API', async () => {
  expect((await juan('GET', '/admin/dashboard')).status, 403, 'registered user');
  expect((await officer('GET', '/admin/dashboard')).status, 403, 'officer');
  expect((await admin('GET', '/admin/dashboard')).status, 200, 'admin');
  expect((await admin('GET', '/admin/counts')).status, 200, 'counts');
});

console.log('Screening');
const routeId = await submitted('B4 Test Route Spring');
await check('the screening page shows the record and the automatic checks', async () => {
  const r = await admin('GET', `/admin/destinations/${routeId}`);
  expect(r.status, 200, 'status');
  expect(Array.isArray(r.data.checks.prohibited), true, 'checks');
  expect(r.data.officers.length > 0, true, 'officers for Porac');
});
await check('pass and route: officers notified, photos approved', async () => {
  const count = async () =>
    (await query(`SELECT count(*)::int AS n FROM notifications WHERE type = 'routed_nomination'`))
      .rows[0].n;
  const before = await count();
  const r = await admin('POST', `/admin/destinations/${routeId}/screen`, {
    body: { decision: 'route' },
  });
  expect(r.status, 200, 'status');
  expect(r.data.status, 'pending_endorsement', 'workflow');
  expect((await count()) > before, true, 'officer notified');
  const photos = await query(
    `SELECT bool_and(moderation_status = 'approved') AS ok FROM destination_images WHERE destination_id = $1`,
    [routeId],
  );
  expect(photos.rows[0].ok, true, 'photos approved');
  const again = await admin('POST', `/admin/destinations/${routeId}/screen`, {
    body: { decision: 'route' },
  });
  expect(again.status, 409, 'screened twice');
});
await check('return needs remarks; the submitter is notified and sees them', async () => {
  const id = await submitted('B4 Test Return Spring');
  const noRemarks = await admin('POST', `/admin/destinations/${id}/screen`, {
    body: { decision: 'returned' },
  });
  expect(noRemarks.status, 400, 'remarks required');
  const r = await admin('POST', `/admin/destinations/${id}/screen`, {
    body: { decision: 'returned', remarks: 'Please add a clearer photo of the entrance.' },
  });
  expect(r.data.status, 'returned', 'workflow');
  const mine = await juan('GET', `/nominations/${id}`);
  expect(mine.data.lastDecision.remarks.includes('clearer photo'), true, 'remarks shown');
  const n = await query(
    `SELECT 1 FROM notifications n JOIN users u USING (user_id)
     WHERE u.email = 'juan.delacruz@example.com' AND n.type = 'returned' AND n.message LIKE '%B4 Test Return%'`,
  );
  expect(n.rowCount, 1, 'submitter notified');
});
await check('reject is final', async () => {
  const id = await submitted('B4 Test Reject Spring');
  const r = await admin('POST', `/admin/destinations/${id}/screen`, {
    body: { decision: 'rejected', remarks: 'Duplicate of an existing listing.' },
  });
  expect(r.data.status, 'rejected', 'workflow');
  const edit = await juan('PUT', `/nominations/${id}`, { body: { name: 'Changed', ...PIN } });
  expect(edit.status, 403, 'not editable');
});
await check('an endorsed destination can be pulled from public after a report', async () => {
  await query(`UPDATE destinations SET workflow_status = 'endorsed' WHERE destination_id = $1`, [
    routeId,
  ]);
  const r = await admin('POST', `/admin/destinations/${routeId}/pull`, {
    body: { status: 'returned', remarks: 'Report says the entrance fee is wrong.' },
  });
  expect(r.status, 200, 'status');
  expect((await admin('GET', `/destinations/${routeId}`)).status, 404, 'no longer public');
});

console.log('Community content and reports');
const endorsedId = await unreviewed();
let reviewId;
await check('approving a review makes it public', async () => {
  const form = photoForm();
  form.append('rating', '5');
  form.append('text', 'B4 test review.');
  const r = await juan('POST', `/destinations/${endorsedId}/reviews`, { form });
  reviewId = r.data.id;
  made.reviews.push(reviewId);
  const queue = await admin('GET', '/admin/community?status=pending&type=review');
  expect(
    queue.data.items.some((i) => i.id === reviewId),
    true,
    'in the queue',
  );
  await admin('PATCH', `/admin/community/review/${reviewId}`, { body: { status: 'approved' } });
  const page = await juan('GET', `/destinations/${endorsedId}`);
  expect(
    page.data.reviews.some((x) => x.id === reviewId),
    true,
    'public',
  );
});
const status = async () =>
  (await query('SELECT moderation_status FROM reviews WHERE review_id = $1', [reviewId])).rows[0]
    .moderation_status;
await check('a report can be marked under review, then dismissed (content kept)', async () => {
  const ana = person();
  await login(ana, 'ana.reyes@example.com', process.env.SEED_DEMO_PASSWORD);
  const r = await ana('POST', '/reports', {
    body: { target: 'review', id: reviewId, reason: 'Spam or advertising' },
  });
  made.reports.push(r.data.id);
  await admin('POST', `/admin/reports/${r.data.id}/close`, { body: { status: 'under_review' } });
  expect(await status(), 'flagged', 'flagged while reviewed');
  await admin('POST', `/admin/reports/${r.data.id}/close`, { body: { status: 'dismissed' } });
  expect(await status(), 'approved', 'back to approved');
  const closedAgain = await admin('POST', `/admin/reports/${r.data.id}/close`, {
    body: { status: 'resolved' },
  });
  expect(closedAgain.status, 409, 'already closed');
});
await check('resolving with "remove content" removes the review and its photos', async () => {
  const carlo = person();
  await login(carlo, 'carlo.mendoza@example.com', process.env.SEED_DEMO_PASSWORD);
  const r = await carlo('POST', '/reports', {
    body: { target: 'review', id: reviewId, reason: 'Inappropriate content' },
  });
  made.reports.push(r.data.id);
  const done = await admin('POST', `/admin/reports/${r.data.id}/close`, {
    body: { status: 'resolved', removeContent: true },
  });
  expect(done.status, 200, 'status');
  expect(await status(), 'removed', 'review removed');
  const photos = await query(
    `SELECT bool_and(moderation_status = 'removed') AS ok FROM destination_images WHERE review_id = $1`,
    [reviewId],
  );
  expect(photos.rows[0].ok, true, 'photos removed');
  const restore = await admin('PATCH', `/admin/community/review/${reviewId}`, {
    body: { status: 'approved' },
  });
  expect(restore.status, 409, 'cannot restore');
});

console.log('Screening lists');
await check('a prohibited word added by the admin blocks the next post', async () => {
  const add = await admin('POST', '/admin/screening/prohibited-terms', {
    body: { term: 'bawalnatestword', language: 'kapampangan' },
  });
  expect(add.status, 201, 'added');
  made.terms.push(add.data.id);
  const dup = await admin('POST', '/admin/screening/prohibited-terms', {
    body: { term: 'BawalNaTestWord', language: 'kapampangan' },
  });
  expect(dup.status, 409, 'duplicate');
  const form = new FormData();
  form.append('rating', '3');
  form.append('text', 'Medyo bawalnatestword dito');
  const r = await juan('POST', `/destinations/${await unreviewed()}/reviews`, { form });
  expect(r.data.error?.code, 'prohibited_terms', 'blocked by the new word');
});
await check('known destinations can be added, used by the check, and removed', async () => {
  const add = await admin('POST', '/admin/screening/known-destinations', {
    body: { name: 'B4 Test Promoted Place', jurisdictionId: porac, source: 'B4 check' },
  });
  expect(add.status, 201, 'added');
  const found = await juan('POST', '/nominations/check', {
    body: { name: 'B4 Test Promoted Place', jurisdictionId: porac },
  });
  expect(found.data.known.length > 0, true, 'used by the check');
  const removed = await admin('DELETE', `/admin/screening/known-destinations/${add.data.id}`);
  expect(removed.status, 204, 'removed');
});

// Clean up.
const photos = await query(
  `SELECT image_url FROM destination_images
   WHERE destination_id = ANY ($1::int[]) OR review_id = ANY ($2::int[])`,
  [made.destinations, made.reviews],
);
await Promise.allSettled(photos.rows.map((p) => deletePhoto(p.image_url)));
await query('DELETE FROM reports WHERE report_id = ANY ($1::int[])', [made.reports]);
await query('DELETE FROM reviews WHERE review_id = ANY ($1::int[])', [made.reviews]);
await query('DELETE FROM destinations WHERE destination_id = ANY ($1::int[])', [made.destinations]);
await query('DELETE FROM prohibited_terms WHERE term_id = ANY ($1::int[])', [made.terms]);
await query(
  `DELETE FROM notifications WHERE created_at > now() - interval '15 minutes'
     AND (message LIKE '%B4 Test%' OR message LIKE '%after a report (Inappropriate content)%')`,
);
server.close();
await pool.end();
console.log(
  failures ? `\n${failures} check(s) failed.` : '\nAll B4 checks passed. Test data removed.',
);
process.exitCode = failures ? 1 : 0;
