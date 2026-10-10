// npm run db:clear:demo: removes the TEST-ONLY demo data. Staff accounts and reference data stay.
import { requirePool } from '../src/db/pool.js';
import { inTransaction, pgExecutor } from '../db/executor.js';
import { clearDemo } from '../db/seeds/clear-demo.js';

const pool = requirePool();
const client = await pool.connect();
const db = pgExecutor(client);
try {
  await inTransaction(db, () => clearDemo(db));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
