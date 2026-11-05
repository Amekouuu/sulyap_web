// npm run test:b3: end-to-end check of Phase B3 (nominations, checks, reviews, reports) against the
// real database and storage. Uses the demo accounts, and deletes everything it creates.
// Needs: base seed, demo seed, screening lists (npm run db:seed:screening), SEED_DEMO_PASSWORD.
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { pool, query } from '../src/db/pool.js';
import { deletePhoto } from '../src/lib/storage.js';

const ORIGIN = config.clientOrigins[0];
const PASSWORD = process.env.SEED_DEMO_PASSWORD;
let failures = 0;
const created = { destinations: [], reviews: [], reports: [] };

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
const photoForm = (count = 1) => {
  const form = new FormData();
  for (let i = 0; i < count; i += 1)
    form.append('photos', new Blob([PNG], { type: 'image/png' }), `p${i}.png`);
  return form;
};

if (!PASSWORD) throw new Error('SEED_DEMO_PASSWORD is not set.');
const porac = (await query(`SELECT jurisdiction_id FROM jurisdictions WHERE name = 'Porac'`))
  .rows[0].jurisdiction_id;
const PIN = { latitude: 15.0719, longitude: 120.5419 };
const draft = (name, extra = {}) => ({ name, jurisdictionId: porac, ...PIN, ...extra });
const complete = {
  location: 'Sitio Example, Brgy. Villa Maria, Porac',
  description: 'A quiet waterfall reached by a short trail through farmland and bamboo groves.',
  categories: ['Adventure'],
  operatingHours: 'Daily, 7 AM to 5 PM',
};

const juan = person();
const maria = person(); // ID still pending in the demo data
const guest = person();
await juan('POST', '/auth/login', {
  body: { email: 'juan.delacruz@example.com', password: PASSWORD },
});
await maria('POST', '/auth/login', {
  body: { email: 'maria.santos@example.com', password: PASSWORD },
});

console.log('Who may contribute');
await check('guests and users without a verified ID are refused', async () => {
  expect((await guest('GET', '/nominations')).status, 401, 'guest');
  expect((await maria('GET', '/nominations')).status, 403, 'pending ID');
  expect((await maria('POST', '/reports', { body: {} })).status, 403, 'pending ID report');
});

console.log('Nominations');
let id;
await check('a draft needs a name, a town, and a pin inside Pampanga', async () => {
  expect((await juan('POST', '/nominations', { body: { name: 'X' } })).status, 400, 'missing');
  const outside = await juan('POST', '/nominations', {
    body: draft('B3 Test Falls', { latitude: 14.6, longitude: 120.98 }),
  });
  expect(outside.status, 400, 'pin in Manila');
});
await check('a draft saves with only the required fields', async () => {
  const r = await juan('POST', '/nominations', { body: draft('B3 Test Falls') });
  expect(r.status, 201, 'status');
  expect(r.data.status, 'draft', 'workflow');
  id = r.data.id;
  created.destinations.push(id);
});
await check('submitting an incomplete draft lists what is missing', async () => {
  const r = await juan('POST', `/nominations/${id}/submit`, { body: {} });
  expect(r.status, 400, 'status');
  expect(Array.isArray(r.data.error.details), true, 'field list');
});
await check('photos upload, at most 5, and the first is the main photo', async () => {
  await juan('PUT', `/nominations/${id}`, { body: draft('B3 Test Falls', complete) });
  const r = await juan('POST', `/nominations/${id}/photos`, { form: photoForm(2) });
  expect(r.status, 201, 'upload');
  expect(r.data.photos.length, 2, 'count');
  expect(r.data.photos.filter((p) => p.isPrimary).length, 1, 'one main photo');
  const over = await juan('POST', `/nominations/${id}/photos`, { form: photoForm(4) });
  expect(over.status, 400, 'over 5');
});
await check('another user cannot see or change it', async () => {
  const ana = person();
  await ana('POST', '/auth/login', {
    body: { email: 'ana.reyes@example.com', password: PASSWORD },
  });
  expect((await ana('GET', `/nominations/${id}`)).status, 404, 'read');
  expect((await ana('PUT', `/nominations/${id}`, { body: draft('Hijack') })).status, 404, 'write');
});
await check('prohibited words block the submission (also disguised spellings)', async () => {
  await juan('PUT', `/nominations/${id}`, {
    body: draft('B3 Test Falls', {
      ...complete,
      description: `${complete.description} Ang g4g0 ng bantay.`,
    }),
  });
  const r = await juan('POST', `/nominations/${id}/submit`, { body: {} });
  expect(r.status, 400, 'status');
  expect(r.data.error.code, 'prohibited_terms', 'code');
  await juan('PUT', `/nominations/${id}`, { body: draft('B3 Test Falls', complete) });
});
await check('a clean nomination is submitted and the administrators are notified', async () => {
  const count = async () =>
    (await query(`SELECT count(*)::int AS n FROM notifications WHERE type = 'new_nomination'`))
      .rows[0].n;
  const before = await count();
  const r = await juan('POST', `/nominations/${id}/submit`, { body: {} });
  expect(r.status, 200, 'status');
  expect(r.data.status, 'pending_verification', 'workflow');
  expect((await count()) > before, true, 'notified');
  expect(
    (await juan('PUT', `/nominations/${id}`, { body: draft('Changed') })).status,
    403,
    'locked',
  );
});
await check('a similar name in the same town asks for confirmation', async () => {
  const r = await juan('POST', '/nominations', { body: draft('Dara Falls Trail', complete) });
  created.destinations.push(r.data.id);
  await juan('POST', `/nominations/${r.data.id}/photos`, { form: photoForm(1) });
  const first = await juan('POST', `/nominations/${r.data.id}/submit`, { body: {} });
  expect(first.status, 409, 'warning');
  expect(first.data.error.details.duplicates.length > 0, true, 'duplicates listed');
  const anyway = await juan('POST', `/nominations/${r.data.id}/submit`, {
    body: { confirmWarnings: true },
  });
  expect(anyway.status, 200, 'submit anyway');
});
await check('an already-promoted place is flagged', async () => {
  const r = await juan('POST', '/nominations/check', {
    body: { name: 'Miyamit Falls', jurisdictionId: porac },
  });
  expect(r.data.known.length > 0, true, 'known destination found');
});
await check('a draft can be deleted', async () => {
  const r = await juan('POST', '/nominations', { body: draft('B3 Delete Me') });
  expect((await juan('DELETE', `/nominations/${r.data.id}`)).status, 204, 'deleted');
});

console.log('Reviews and reports');
const target = (
  await query(
    `SELECT d.destination_id FROM destinations d WHERE d.workflow_status = 'endorsed'
       AND NOT EXISTS (SELECT 1 FROM reviews r JOIN users u ON u.user_id = r.user_id
                       WHERE r.destination_id = d.destination_id AND u.email = 'juan.delacruz@example.com')
     LIMIT 1`,
  )
).rows[0]?.destination_id;
await check(
  'a review with a photo is saved as pending and hidden from the public page',
  async () => {
    const form = photoForm(1);
    form.append('rating', '4');
    form.append('text', 'B3 test review: clean water, bring snacks.');
    const r = await juan('POST', `/destinations/${target}/reviews`, { form });
    expect(r.status, 201, 'status');
    created.reviews.push(r.data.id);
    const page = await guest('GET', `/destinations/${target}`);
    expect(
      page.data.reviews.some((x) => x.id === r.data.id),
      false,
      'hidden until approved',
    );
    const mine = await juan('GET', '/reviews/mine');
    expect(mine.data.reviews.find((x) => x.id === r.data.id)?.status, 'pending', 'in My Reviews');
  },
);
await check('one review per destination, and prohibited words are blocked', async () => {
  const again = new FormData();
  again.append('rating', '5');
  const second = await juan('POST', `/destinations/${target}/reviews`, { form: again });
  expect(second.status, 409, 'second review');
  const bad = new FormData();
  bad.append('rating', '1');
  bad.append('text', 'Putangina ang init');
  const other = (
    await query(
      `SELECT d.destination_id FROM destinations d WHERE d.workflow_status = 'endorsed'
         AND d.destination_id <> $1
         AND NOT EXISTS (SELECT 1 FROM reviews r JOIN users u ON u.user_id = r.user_id
                         WHERE r.destination_id = d.destination_id AND u.email = 'juan.delacruz@example.com')
       LIMIT 1`,
      [target],
    )
  ).rows[0]?.destination_id;
  if (!other) return;
  const r = await juan('POST', `/destinations/${other}/reviews`, { form: bad });
  expect(r.status, 400, 'blocked');
  expect(r.data.error.code, 'prohibited_terms', 'code');
});
await check(
  'reports: approved content only, one open report each, details when needed',
  async () => {
    const review = (
      await query(
        `SELECT r.review_id FROM reviews r JOIN users u ON u.user_id = r.user_id
       WHERE r.moderation_status = 'approved' AND u.email <> 'juan.delacruz@example.com' LIMIT 1`,
      )
    ).rows[0].review_id;
    const body = {
      target: 'review',
      id: review,
      reason: 'Spam or advertising',
      details: 'B3 test',
    };
    const r = await juan('POST', '/reports', { body });
    expect(r.status, 201, 'reported');
    created.reports.push(r.data.id);
    expect((await juan('POST', '/reports', { body })).status, 409, 'duplicate');
    const pending = { target: 'review', id: created.reviews[0], reason: 'Spam or advertising' };
    expect((await juan('POST', '/reports', { body: pending })).status, 404, 'pending review');
    const wrong = { target: 'destination', id: target, reason: 'Wrong information' };
    expect((await juan('POST', '/reports', { body: wrong })).status, 400, 'details needed');
  },
);

// Clean up everything this run created.
const photos = await query(
  `SELECT image_url FROM destination_images
   WHERE destination_id = ANY ($1::int[]) OR review_id = ANY ($2::int[])`,
  [created.destinations, created.reviews],
);
await Promise.allSettled(photos.rows.map((p) => deletePhoto(p.image_url)));
await query('DELETE FROM reports WHERE report_id = ANY ($1::int[])', [created.reports]);
await query('DELETE FROM reviews WHERE review_id = ANY ($1::int[])', [created.reviews]);
await query('DELETE FROM destinations WHERE destination_id = ANY ($1::int[])', [
  created.destinations,
]);
await query(
  `DELETE FROM notifications WHERE type = 'new_nomination'
     AND (message LIKE '%B3 Test Falls%' OR message LIKE '%Dara Falls Trail%')`,
);
server.close();
await pool.end();
console.log(
  failures ? `\n${failures} check(s) failed.` : '\nAll B3 checks passed. Test data removed.',
);
process.exitCode = failures ? 1 : 0;
