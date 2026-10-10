// npm run db:migrate: applies new files from db/migrations to the database in DATABASE_URL.
import { requirePool } from '../src/db/pool.js';
import { pgExecutor } from '../db/executor.js';
import { runMigrations } from '../db/migrate.js';

const pool = requirePool();
const client = await pool.connect();
try {
  await runMigrations(pgExecutor(client));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
