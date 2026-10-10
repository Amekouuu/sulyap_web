// Applies every .sql file in db/migrations that has not run yet, in file-name order.
// Each file runs in its own transaction and is recorded in schema_migrations.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inTransaction } from './executor.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations/', import.meta.url));

export async function runMigrations(executor, log = console.log) {
  await executor.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT now()
    )`);
  const { rows } = await executor.query('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.filename));
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(MIGRATIONS_DIR + file, 'utf8');
    try {
      await inTransaction(executor, async () => {
        await executor.exec(sql);
        await executor.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      });
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${error.message}`);
    }
    log(`  applied ${file}`);
    count += 1;
  }
  log(count ? `${count} migration(s) applied.` : 'Database is already up to date.');
  return count;
}
