// npm run db:check: runs every migration and seed against a throwaway in-memory PostgreSQL (PGlite),
// then checks the main rules of the schema. Needs no Supabase project and touches no real data.
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pgliteExecutor } from '../db/executor.js';
import { runMigrations } from '../db/migrate.js';
import { seedBase } from '../db/seeds/base.js';
import { seedDemo } from '../db/seeds/demo.js';
import { clearDemo } from '../db/seeds/clear-demo.js';

const quiet = () => {};
const db = pgliteExecutor(await PGlite.create({ extensions: { pg_trgm } }));
let failures = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ok    ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL  ${name}\n        ${error.message}`);
  }
}

function expectEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

async function count(sql, params) {
  const { rows } = await db.query(sql, params);
  return Number(rows[0].n);
}

// The statement must fail, and the error message must match the pattern.
async function rejects(name, sql, params, pattern) {
  await check(name, async () => {
    try {
      await db.query(sql, params);
    } catch (error) {
      if (!pattern.test(error.message))
        throw new Error(`failed for another reason: ${error.message}`);
      return;
    }
    throw new Error('the database accepted a row it should have refused');
  });
}

const userId = async (email) =>
  (await db.query('SELECT user_id FROM users WHERE email = $1', [email])).rows[0].user_id;

console.log('Schema and seeds');
await check('migrations apply cleanly', async () => {
  await runMigrations(db, quiet);
  expectEqual(
    await count(
      `SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = 'public'`,
    ),
    18,
    'tables (17 + schema_migrations)',
  );
});
await check('migrations are not re-applied', async () => {
  expectEqual(await runMigrations(db, quiet), 0, 'migrations applied on second run');
});
await check('base seed loads and can run twice', async () => {
  await seedBase(db, { staffPassword: 'check-only-password', log: quiet });
  await seedBase(db, { staffPassword: 'check-only-password', log: quiet });
  expectEqual(await count('SELECT count(*) AS n FROM jurisdictions'), 22, 'jurisdictions');
  expectEqual(await count('SELECT count(*) AS n FROM categories'), 6, 'categories');
  expectEqual(await count('SELECT count(*) AS n FROM classification_criteria'), 3, 'criteria');
  expectEqual(
    await count(`SELECT count(*) AS n FROM users WHERE role = 'administrator'`),
    1,
    'admins',
  );
  expectEqual(
    await count(`SELECT count(*) AS n FROM users WHERE role = 'tourism_officer'`),
    1,
    'officers',
  );
});
await check('officer jurisdictions follow the study setup', async () => {
  const assigned = async (email) =>
    count(
      `SELECT count(*) AS n FROM officer_jurisdictions oj JOIN users u ON u.user_id = oj.officer_id
       WHERE u.email = $1`,
      [email],
    );
  expectEqual(await assigned('lto.main@sulyap.site'), 22, 'lto.main');
});
await check('demo seed loads, with the two routing-test officers', async () => {
  await seedDemo(db, { demoPassword: 'check-only', log: quiet });
  const assigned = async (email) =>
    count(
      `SELECT count(*) AS n FROM officer_jurisdictions oj JOIN users u ON u.user_id = oj.officer_id
       WHERE u.email = $1`,
      [email],
    );
  expectEqual(await assigned('lto.mabalacat@example.com'), 1, 'test officer Mabalacat City');
  expectEqual(await assigned('lto.angeles@example.com'), 1, 'test officer Angeles City');
  expectEqual(
    await count(`SELECT count(*) AS n FROM destinations WHERE workflow_status = 'endorsed'`),
    6,
    'endorsed',
  );
  expectEqual(await count('SELECT count(*) AS n FROM reports'), 5, 'reports');
});
await check('newest endorsement comes first (default browse order)', async () => {
  const { rows } = await db.query(
    `SELECT d.name FROM destinations d
     JOIN LATERAL (SELECT max(endorsed_at) AS at FROM endorsement_logs e
                   WHERE e.destination_id = d.destination_id AND e.endorsement_status = 'endorsed') e ON true
     WHERE d.workflow_status = 'endorsed'
     ORDER BY e.at DESC`,
  );
  expectEqual(rows[0].name, 'Dara Falls', 'first destination');
});
await check('similar-name search works (pg_trgm)', async () => {
  const { rows } = await db.query(`SELECT similarity('Dara Fals', 'Dara Falls') > 0.4 AS close`);
  expectEqual(rows[0].close, true, 'similarity above 0.4');
});

console.log('Rules the database enforces');
const juan = await userId('juan.delacruz@example.com');
const admin = await userId('admin@sulyap.site');
const anyDestination = (await db.query('SELECT destination_id FROM destinations LIMIT 1')).rows[0]
  .destination_id;
const anyReview = (await db.query('SELECT review_id FROM reviews LIMIT 1')).rows[0].review_id;

await rejects(
  'e-mail addresses are unique regardless of case',
  `INSERT INTO users (full_name, email, password_hash, role) VALUES ('X', 'ADMIN@sulyap.site', 'x', 'administrator')`,
  [],
  /users_email_unique/,
);
await rejects(
  'registered users need a contact number',
  `INSERT INTO users (full_name, email, password_hash, role) VALUES ('X', 'x@example.org', 'x', 'registered_user')`,
  [],
  /users_registered_user_contact/,
);
await check('home address is optional for registered users', async () => {
  await db.query(
    `INSERT INTO users (full_name, email, contact_number, password_hash, role)
     VALUES ('No Address Yet', 'no.address@example.com', '09170000000', 'x', 'registered_user')`,
  );
});
await rejects(
  'home coordinates come as a pair',
  `UPDATE users SET address_latitude = 15.1 WHERE email = 'no.address@example.com'`,
  [],
  /users_home_coordinates_pair/,
);
await rejects(
  'ratings must be 1 to 5',
  'INSERT INTO reviews (destination_id, user_id, rating) VALUES ($1, $2, 6)',
  [anyDestination, juan],
  /check constraint/,
);
await rejects(
  'a report points at exactly one item',
  `INSERT INTO reports (reported_by, review_id, destination_id, reason) VALUES ($1, $2, $3, 'x')`,
  [juan, anyReview, anyDestination],
  /reports_exactly_one_target/,
);
await rejects(
  'only officers can write endorsement logs',
  `INSERT INTO endorsement_logs (destination_id, tourism_officer_id, endorsement_status) VALUES ($1, $2, 'endorsed')`,
  [anyDestination, admin],
  /tourism_officer role/,
);
await rejects(
  'only registered users can write reviews',
  'INSERT INTO reviews (destination_id, user_id, rating) VALUES ($1, $2, 4)',
  [anyDestination, admin],
  /registered_user role/,
);
await rejects(
  'review counts belong to the first criterion only',
  `INSERT INTO destination_criteria (destination_id, criterion_id, google_maps_review_count)
   SELECT destination_id, 2, 3 FROM destinations WHERE workflow_status = 'pending_endorsement' LIMIT 1`,
  [],
  /destination_criteria_counts_first_only/,
);
await rejects(
  'a destination has at most one primary photo',
  `INSERT INTO destination_images (destination_id, user_id, is_primary, image_url)
   SELECT destination_id, user_id, true, '/x.jpg' FROM destination_images WHERE is_primary LIMIT 1`,
  [],
  /destination_images_one_primary/,
);
await rejects(
  'unknown notification types are refused',
  `INSERT INTO notifications (user_id, type, message) VALUES ($1, 'unknown', 'x')`,
  [juan],
  /check constraint/,
);
await check('"rejected" notifications are accepted', async () => {
  await db.query(
    `INSERT INTO notifications (user_id, type, message) VALUES ($1, 'rejected', 'x')`,
    [juan],
  );
});
await check('entrance fee accepts free text', async () => {
  await db.query(
    `UPDATE destinations SET entrance_fee = 'P30-P50 (children free)' WHERE destination_id = $1`,
    [anyDestination],
  );
});

console.log('Demo cleanup');
await check('db:clear:demo removes all demo rows and keeps the setup data', async () => {
  await clearDemo(db, { log: quiet });
  expectEqual(await count('SELECT count(*) AS n FROM users'), 2, 'users left (staff only)');
  expectEqual(await count('SELECT count(*) AS n FROM destinations'), 0, 'destinations left');
  expectEqual(await count('SELECT count(*) AS n FROM reviews'), 0, 'reviews left');
  expectEqual(
    await count('SELECT count(*) AS n FROM known_destinations'),
    0,
    'known destinations left',
  );
  expectEqual(await count('SELECT count(*) AS n FROM jurisdictions'), 22, 'jurisdictions left');
});

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exitCode = failures ? 1 : 0;
