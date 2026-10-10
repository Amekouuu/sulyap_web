// npm run db:seed: loads the required setup data and staff accounts.
import { requirePool } from '../src/db/pool.js';
import { inTransaction, pgExecutor } from '../db/executor.js';
import { seedBase } from '../db/seeds/base.js';

const pool = requirePool();
const client = await pool.connect();
const db = pgExecutor(client);
try {
  await inTransaction(db, () => seedBase(db, { staffPassword: process.env.SEED_STAFF_PASSWORD }));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
