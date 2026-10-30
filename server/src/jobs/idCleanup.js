// Deletes ID photos 24 hours after the verification decision (verified or rejected).
// Only the status, ID type, verifying administrator, and date are kept.
// Safe to run any number of times: each photo is deleted once and its reference cleared.
import { pool, query } from '../db/pool.js';
import { deleteIdImage } from '../lib/storage.js';

export async function runIdCleanup(log = console.log) {
  const { rows } = await query(
    `SELECT user_id, id_document_url FROM users
     WHERE id_document_url IS NOT NULL
       AND account_verification_status IN ('verified', 'rejected')
       AND verified_at < now() - interval '24 hours'`,
  );
  let removed = 0;
  for (const row of rows) {
    try {
      await deleteIdImage(row.id_document_url);
    } catch (error) {
      log(`ID cleanup: could not delete the image of user ${row.user_id}: ${error.message}`);
      continue;
    }
    await query(
      'UPDATE users SET id_document_url = NULL WHERE user_id = $1 AND id_document_url = $2',
      [row.user_id, row.id_document_url],
    );
    removed += 1;
  }
  if (removed) log(`ID cleanup: deleted ${removed} ID image(s).`);
  return removed;
}

// Runs shortly after start-up and then every hour while the server is awake.
// When the host puts the server to sleep, an outside scheduler can call
// POST /api/internal/jobs/id-cleanup instead (see routes/internal.js).
export function scheduleIdCleanup() {
  if (!pool) return;
  const run = () =>
    runIdCleanup().catch((error) => console.error(`ID cleanup failed: ${error.message}`));
  setTimeout(run, 15 * 1000).unref();
  setInterval(run, 60 * 60 * 1000).unref();
}
