// npm run jobs:cleanup-ids: deletes ID photos whose decision is more than 24 hours old.
import { pool } from '../src/db/pool.js';
import { runIdCleanup } from '../src/jobs/idCleanup.js';

try {
  const removed = await runIdCleanup();
  console.log(`${removed} ID image(s) deleted.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
