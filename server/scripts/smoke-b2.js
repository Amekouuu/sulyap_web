// npm run test:b2: checks Phase B2 (public browsing) against the real database. Read-only.
// Needs at least two endorsed destinations (the demo seed has six).
import { createApp } from '../src/app.js';
import { pool, query } from '../src/db/pool.js';

let failures = 0;
const server = createApp().listen(0);
const base = `http://localhost:${server.address().port}/api/destinations`;

async function get(path) {
  const response = await fetch(base + path);
  return { status: response.status, data: await response.json().catch(() => null) };
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
function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const endorsed = (
  await query(`SELECT destination_id FROM destinations WHERE workflow_status = 'endorsed'`)
).rows.map((r) => r.destination_id);
const hidden = (
  await query(`SELECT destination_id FROM destinations WHERE workflow_status <> 'endorsed' LIMIT 1`)
).rows[0]?.destination_id;
const all = (await get('?pageSize=48')).data.destinations;

console.log('Listing');
await check('only endorsed destinations are listed', () => {
  expect(
    all.length === Math.min(endorsed.length, 48),
    `listed ${all.length} of ${endorsed.length}`,
  );
  expect(
    all.every((d) => endorsed.includes(d.id)),
    'a non-endorsed destination was listed',
  );
});
await check('newest endorsement comes first', () => {
  const dates = all.map((d) => new Date(d.endorsedAt).getTime());
  expect(
    dates.every((t, i) => i === 0 || dates[i - 1] >= t),
    'not ordered by endorsement date',
  );
});
await check('A–Z sort is alphabetical', async () => {
  const names = (await get('?sort=az&pageSize=48')).data.destinations.map((d) => d.name);
  const sorted = [...names].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  expect(names.join('|') === sorted.join('|'), names.join(', '));
});
await check('category filter keeps only matching destinations', async () => {
  const category = all[0].categories[0];
  const list = (await get(`?categories=${encodeURIComponent(category)}`)).data.destinations;
  expect(list.length > 0, 'nothing found');
  expect(
    list.every((d) => d.categories.includes(category)),
    'a destination without the category was listed',
  );
});
await check('season filter leaves out untagged destinations', async () => {
  for (const season of ['Rainy', 'Summer']) {
    const list = (await get(`?season=${season}`)).data.destinations;
    expect(
      list.every((d) => d.season === season),
      `${season} filter listed another season`,
    );
  }
});
await check('search matches the municipality name', async () => {
  const town = all[0].jurisdiction;
  const list = (await get(`?q=${encodeURIComponent(town.slice(0, 4))}`)).data.destinations;
  expect(
    list.some((d) => d.id === all[0].id),
    `searching "${town.slice(0, 4)}" missed ${all[0].name}`,
  );
});
await check('paging splits the list', async () => {
  const first = await get('?pageSize=1&page=1');
  const second = await get('?pageSize=1&page=2');
  expect(first.data.total === endorsed.length, 'total is wrong');
  expect(first.data.destinations[0].id !== second.data.destinations[0]?.id, 'same item twice');
});
await check('bad filter values are refused', async () => {
  expect((await get('?season=Winter')).status === 400, 'season=Winter accepted');
  expect((await get('?sort=popular')).status === 400, 'sort=popular accepted');
});
await check('overview counts match', async () => {
  const { data } = await get('/overview');
  expect(data.total === endorsed.length, `total ${data.total}`);
  expect(Object.keys(data.categories).length === 6, 'not six categories');
});
await check('map pins cover every endorsed destination, inside Pampanga', async () => {
  const pins = (await get('/map')).data.destinations;
  expect(pins.length === endorsed.length, `${pins.length} pins`);
  expect(
    pins.every(
      (p) => p.latitude > 14.6 && p.latitude < 15.3 && p.longitude > 120.3 && p.longitude < 121,
    ),
    'a pin is outside Pampanga',
  );
});

console.log('Destination page');
await check('a non-endorsed destination is not public', async () => {
  if (!hidden) return;
  expect((await get(`/${hidden}`)).status === 404, 'it was returned');
});
for (const id of endorsed.slice(0, 6)) {
  await check(
    `destination ${id}: only approved reviews and photos, valid similar list`,
    async () => {
      const { status, data } = await get(`/${id}`);
      expect(status === 200, `status ${status}`);
      const approvedReviews = (
        await query(
          `SELECT count(*)::int AS n FROM reviews WHERE destination_id = $1 AND moderation_status = 'approved'`,
          [id],
        )
      ).rows[0].n;
      expect(data.reviews.length === approvedReviews, 'review count differs from approved reviews');
      expect(data.rating.count === approvedReviews, 'rating count is wrong');
      const photoIds = data.photos.map((p) => p.id);
      if (photoIds.length) {
        const notApproved = await query(
          `SELECT 1 FROM destination_images WHERE image_id = ANY ($1::int[]) AND moderation_status <> 'approved'`,
          [photoIds],
        );
        expect(!notApproved.rowCount, 'an unapproved photo is shown');
      }
      expect(data.similar.length <= 3, 'more than three similar');
      expect(
        data.similar.every((s) => s.id !== id && endorsed.includes(s.id)),
        'similar includes itself or a non-endorsed place',
      );
      for (const s of data.similar.filter((x) => x.reason === 'category')) {
        expect(
          s.categories.some((c) => data.categories.includes(c)),
          `${s.name} shares no category`,
        );
      }
    },
  );
}

server.close();
await pool.end();
console.log(failures ? `\n${failures} check(s) failed.` : '\nAll B2 checks passed.');
process.exitCode = failures ? 1 : 0;
