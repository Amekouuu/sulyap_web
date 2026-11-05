// npm run db:seed:screening: loads the researched screening lists from db/seeds/screening/*.csv.
import { requirePool } from '../src/db/pool.js';
import { inTransaction, pgExecutor } from '../db/executor.js';
import { seedScreening } from '../db/seeds/screening.js';

const pool = requirePool();
const client = await pool.connect();
const db = pgExecutor(client);
try {
  await inTransaction(db, () => seedScreening(db));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
