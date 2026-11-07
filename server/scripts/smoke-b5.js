// npm run test:b5: end-to-end check of Phase B5 (Local Tourism Officer portal) against the real
// database, including the routing test (officers only see their own jurisdictions).
// Creates its own test nominations and deletes them. Needs base + demo seeds and both passwords.
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { pool, query } from '../src/db/pool.js';
import { deletePhoto } from '../src/lib/storage.js';

let failures = 0;
const made = [];
const server = createApp().listen(0);
const base = `http://localhost:${server.address().port}/api`;

function person() {
  let cookie = '';
  return async function call(method, path, { body, form } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: config.clientOrigins[0],
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

const STAFF = process.env.SEED_STAFF_PASSWORD;
const DEMO = process.env.SEED_DEMO_PASSWORD;
const login = async (email, password) => {
  const who = person();
  await who('POST', '/auth/login', { body: { email, password } });
  return who;
};
const admin = await login('admin@sulyap.site', STAFF);
const juan = await login('juan.delacruz@example.com', DEMO);
const main = await login('lto.main@sulyap.site', STAFF);
const mabalacat = await login('lto.mabalacat@example.com', DEMO);
const porac = (await query(`SELECT jurisdiction_id FROM jurisdictions WHERE name = 'Porac'`))
  .rows[0].jurisdiction_id;

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
// A nomination in Porac that has passed screening.
async function routed(name) {
  const r = await juan('POST', '/nominations', {
    body: {
      name,
      jurisdictionId: porac,
      latitude: 15.0719,
      longitude: 120.5419,
      location: 'Brgy. Test, Porac',
      description: 'A test place made by the B5 check. It will be deleted at the end.',
      categories: ['Adventure'],
      operatingHours: 'Daily',
      bestTimeToVisit: 'March to May',
    },
  });
  made.push(r.data.id);
  const form = new FormData();
  form.append('photos', new Blob([PNG], { type: 'image/png' }), 'p.png');
  await juan('POST', `/nominations/${r.data.id}/photos`, { form });
  await juan('POST', `/nominations/${r.data.id}/submit`, { body: { confirmWarnings: true } });
  await admin('POST', `/admin/destinations/${r.data.id}/screen`, { body: { decision: 'route' } });
  return r.data.id;
}
const checklist = (overrides = {}) => ({
  criteria: [
    {
      id: 1,
      status: 'met',
      notes: 'Searched both sites',
      googleMapsReviews: 2,
      tripadvisorReviews: 0,
      observedAt: new Date().toISOString().slice(0, 10),
      ...overrides.first,
    },
    { id: 2, status: 'met', notes: 'Not on ACTOP or LGU pages', ...overrides.second },
    { id: 3, status: 'met', notes: 'No guidebooks or tours', ...overrides.third },
  ],
  seasonTag: 'Summer',
});

const id = await routed('B5 Test Endorse Falls');

console.log('Routing');
await check('only staff officers can open the officer portal', async () => {
  expect((await juan('GET', '/officer/submissions')).status, 403, 'registered user');
  expect((await admin('GET', '/officer/submissions')).status, 403, 'administrator');
});
await check('the officer for Porac sees it; the Mabalacat-only officer does not', async () => {
  const mainList = await main('GET', '/officer/submissions');
  expect(
    mainList.data.submissions.some((s) => s.id === id),
    true,
    'all-jurisdiction officer',
  );
  const other = await mabalacat('GET', '/officer/submissions');
  expect(
    other.data.submissions.some((s) => s.id === id),
    false,
    'Mabalacat officer list',
  );
  expect((await mabalacat('GET', `/officer/submissions/${id}`)).status, 404, 'Mabalacat detail');
});

console.log('Checklist and decision');
await check('the checklist saves as a draft and shows "Continue review"', async () => {
  const r = await main('PUT', `/officer/submissions/${id}/checklist`, {
    body: checklist({ second: { status: 'not_assessed' } }),
  });
  expect(r.status, 200, 'saved');
  const list = await main('GET', '/officer/submissions');
  expect(list.data.submissions.find((s) => s.id === id)?.hasDraft, true, 'draft flag');
  const detail = await main('GET', `/officer/submissions/${id}`);
  expect(detail.data.criteria[0].googleMapsReviews, 2, 'counts kept');
});
await check('endorse needs all three met, both counts, the date, and 5 or fewer each', async () => {
  const post = (body) => main('POST', `/officer/submissions/${id}/decision`, { body });
  const notMet = await post({ ...checklist({ third: { status: 'not_met' } }), decision: 'endorsed' });
  expect(notMet.status, 400, 'not all met');
  const over = await post({ ...checklist({ first: { googleMapsReviews: 6 } }), decision: 'endorsed' });
  expect(over.status, 400, 'over the limit');
  const noDate = await post({ ...checklist({ first: { observedAt: null } }), decision: 'endorsed' });
  expect(noDate.status, 400, 'no date');
  expect((await post({ ...checklist(), decision: 'returned' })).status, 400, 'return remarks');
});
await check('endorsing makes it public with the season tag and notifies the submitter', async () => {
  const r = await main('POST', `/officer/submissions/${id}/decision`, {
    body: { ...checklist(), decision: 'endorsed' },
  });
  expect(r.status, 200, 'status');
  const page = await juan('GET', `/destinations/${id}`);
  expect(page.status, 200, 'public');
  expect(page.data.season, 'Summer', 'season tag');
  const n = await query(
    `SELECT 1 FROM notifications n JOIN users u USING (user_id)
     WHERE u.email = 'juan.delacruz@example.com' AND n.type = 'endorsement' AND n.message LIKE '%B5 Test Endorse%'`,
  );
  expect(n.rowCount, 1, 'notified');
  const reviewed = await main('GET', '/officer/reviewed?status=endorsed');
  expect(
    reviewed.data.reviewed.some((x) => x.id === id),
    true,
    'in Reviewed',
  );
});
await check('the first decision wins', async () => {
  const again = await main('POST', `/officer/submissions/${id}/decision`, {
    body: { ...checklist(), decision: 'rejected', remarks: 'Changing my mind' },
  });
  expect(again.status, 409, 'second decision refused');
});
await check('returning sends it back to the submitter with the remarks', async () => {
  const other = await routed('B5 Test Return Falls');
  const r = await main('POST', `/officer/submissions/${other}/decision`, {
    body: {
      ...checklist({ first: { googleMapsReviews: 40 } }),
      decision: 'returned',
      remarks: 'Already has many Google Maps reviews; add a lesser-known part of the site.',
    },
  });
  expect(r.status, 200, 'status');
  const mine = await juan('GET', `/nominations/${other}`);
  expect(mine.data.status, 'returned', 'status for submitter');
  expect(mine.data.lastDecision.by, 'tourism_officer', 'remarks from the officer');
});

const photos = await query(
  'SELECT image_url FROM destination_images WHERE destination_id = ANY ($1::int[])',
  [made],
);
await Promise.allSettled(photos.rows.map((p) => deletePhoto(p.image_url)));
await query('DELETE FROM destinations WHERE destination_id = ANY ($1::int[])', [made]);
await query(`DELETE FROM notifications WHERE message LIKE '%B5 Test%'`);
server.close();
await pool.end();
console.log(
  failures ? `\n${failures} check(s) failed.` : '\nAll B5 checks passed. Test data removed.',
);
process.exitCode = failures ? 1 : 0;
