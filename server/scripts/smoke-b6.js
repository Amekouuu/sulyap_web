// npm run test:b6: end-to-end check of Phase B6 (home location and Nearby Lesser-Known) against
// the real database. Juan's home location is put back the way it was at the end.
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { pool, query } from '../src/db/pool.js';

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

const JUAN = 'juan.delacruz@example.com';
const saved = (
  await query(
    'SELECT home_address, address_latitude, address_longitude FROM users WHERE email = $1',
    [JUAN],
  )
).rows[0];
const juan = person();
await juan('POST', '/auth/login', {
  body: { email: JUAN, password: process.env.SEED_DEMO_PASSWORD },
});
const admin = person();
await admin('POST', '/auth/login', {
  body: { email: 'admin@sulyap.site', password: process.env.SEED_STAFF_PASSWORD },
});
const guest = person();

// Use an endorsed destination as "home" so at least one place is 0 km away.
const target = (
  await query(
    `SELECT destination_id, latitude::float AS lat, longitude::float AS lng FROM destinations
     WHERE workflow_status = 'endorsed' ORDER BY destination_id LIMIT 1`,
  )
).rows[0];

console.log('Home location');
await check('guests and staff cannot use Nearby', async () => {
  expect((await guest('GET', '/destinations/nearby')).status, 401, 'guest');
  expect((await admin('GET', '/destinations/nearby')).status, 403, 'administrator');
  const home = await admin('PUT', '/account/home', { body: { latitude: 15, longitude: 120.6 } });
  expect(home.status, 403, 'admin home');
});
await check('without a home location, Nearby asks for one', async () => {
  await juan('DELETE', '/account/home');
  const r = await juan('GET', '/destinations/nearby?radius=10');
  expect(r.status, 409, 'status');
  expect(r.data.error.code, 'no_home_location', 'code');
});
await check('a pin outside the Philippines is refused', async () => {
  const r = await juan('PUT', '/account/home', { body: { latitude: 35.6, longitude: 139.7 } });
  expect(r.status, 400, 'status');
});
await check('saving a pin sets the home location (address optional)', async () => {
  const r = await juan('PUT', '/account/home', {
    body: { address: 'B6 test home', latitude: target.lat, longitude: target.lng },
  });
  expect(r.status, 200, 'status');
  expect(r.data.user.hasHomeLocation, true, 'has home');
  expect(r.data.user.homeAddress, 'B6 test home', 'label');
});

console.log('Nearby');
await check('only 5, 10, or 20 km are allowed', async () => {
  expect((await juan('GET', '/destinations/nearby?radius=7')).status, 400, '7 km');
});
await check('lists endorsed places nearest first, all within the radius', async () => {
  for (const radius of [5, 10, 20]) {
    const r = await juan('GET', `/destinations/nearby?radius=${radius}`);
    expect(r.status, 200, `status ${radius}`);
    const list = r.data.destinations;
    expect(list[0]?.id, target.destination_id, `nearest at ${radius} km`);
    expect(list[0].distanceKm, 0, 'distance to itself');
    const ordered = list.every(
      (d, i) => d.distanceKm <= radius && (i === 0 || list[i - 1].distanceKm <= d.distanceKm),
    );
    expect(ordered, true, `sorted and within ${radius} km`);
  }
  const five = (await juan('GET', '/destinations/nearby?radius=5')).data.destinations.length;
  const twenty = (await juan('GET', '/destinations/nearby?radius=20')).data.destinations.length;
  expect(twenty >= five, true, 'a wider radius never shows fewer');
});
await check('only endorsed destinations are listed', async () => {
  const r = await juan('GET', '/destinations/nearby?radius=20');
  const ids = r.data.destinations.map((d) => d.id);
  const bad = await query(
    `SELECT 1 FROM destinations
     WHERE destination_id = ANY ($1::int[]) AND workflow_status <> 'endorsed'`,
    [ids],
  );
  expect(bad.rowCount, 0, 'non-endorsed rows');
});
await check('the address search answers (needs internet; OpenStreetMap)', async () => {
  const r = await juan('POST', '/account/home/lookup', {
    body: { address: 'Angeles City, Pampanga' },
  });
  if (r.status === 502) {
    console.log('        (skipped: the geocoder could not be reached)');
    return;
  }
  expect(r.status, 200, 'status');
  expect(r.data.results.length > 0, true, 'at least one result');
  const first = r.data.results[0];
  expect(first.latitude > 14.9 && first.latitude < 15.4, true, 'latitude near Angeles');
});

await query(
  `UPDATE users SET home_address = $2, address_latitude = $3, address_longitude = $4
   WHERE email = $1`,
  [JUAN, saved.home_address, saved.address_latitude, saved.address_longitude],
);
server.close();
await pool.end();
console.log(
  failures ? `\n${failures} check(s) failed.` : '\nAll B6 checks passed. Home location restored.',
);
process.exitCode = failures ? 1 : 0;
