// Removes everything loaded by the demo seed. Staff accounts and reference data stay.
import { DEMO_EMAIL_DOMAIN, DEMO_KNOWN_SOURCE, DEMO_PROHIBITED_TERMS } from './demo-data.js';

export async function clearDemo(db, { log = console.log } = {}) {
  const { rows } = await db.query('SELECT user_id FROM users WHERE lower(email) LIKE $1', [
    '%' + DEMO_EMAIL_DOMAIN,
  ]);
  const ids = rows.map((row) => row.user_id);

  await db.query('DELETE FROM known_destinations WHERE source = $1', [DEMO_KNOWN_SOURCE]);
  await db.query('DELETE FROM prohibited_terms WHERE lower(term) = ANY ($1::text[])', [
    DEMO_PROHIBITED_TERMS.map((t) => t.term.toLowerCase()),
  ]);
  // Deleting the destinations also removes their photos, reviews, criteria, logs and reports.
  await db.query('DELETE FROM destinations WHERE submitted_by = ANY ($1::int[])', [ids]);
  // Decisions made by the test officers on any other destination go too.
  await db.query('DELETE FROM endorsement_logs WHERE tourism_officer_id = ANY ($1::int[])', [ids]);
  // Deleting the users removes the rest of their content, notifications and tokens.
  await db.query('DELETE FROM users WHERE user_id = ANY ($1::int[])', [ids]);

  log(`Demo data removed (${ids.length} demo account(s)).`);
}
