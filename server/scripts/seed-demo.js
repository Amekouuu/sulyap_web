// npm run db:seed:demo: loads TEST-ONLY demo data. Remove it with npm run db:clear:demo.
import { isProduction } from '../src/config.js';
import { requirePool } from '../src/db/pool.js';
import { inTransaction, pgExecutor } from '../db/executor.js';
import { seedDemo } from '../db/seeds/demo.js';

if (isProduction) {
  console.error('Refusing to load demo data while NODE_ENV=production.');
  process.exit(1);
}

const pool = requirePool();
const client = await pool.connect();
const db = pgExecutor(client);
try {
  await inTransaction(db, () => seedDemo(db, { demoPassword: process.env.SEED_DEMO_PASSWORD }));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
