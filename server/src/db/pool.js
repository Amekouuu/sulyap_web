// PostgreSQL connection pool. Every query must use $1, $2... placeholders, never string-built SQL.
import fs from 'node:fs';
import pg from 'pg';
import { config } from '../config.js';

function sslOptions() {
  if (!config.databaseSsl) return false;
  if (config.databaseCaCert) {
    return { ca: fs.readFileSync(config.databaseCaCert, 'utf8'), rejectUnauthorized: true };
  }
  // Encrypted, but without checking the certificate. Set DATABASE_CA_CERT to check it as well.
  return { rejectUnauthorized: false };
}

export const pool = config.databaseUrl
  ? new pg.Pool({ connectionString: config.databaseUrl, ssl: sslOptions(), max: 10 })
  : null;

export function requirePool() {
  if (!pool) throw new Error('DATABASE_URL is not set. Add it to server/.env first.');
  return pool;
}

export function query(text, params) {
  return requirePool().query(text, params);
}

// Runs fn(client) inside BEGIN/COMMIT and rolls back if anything throws.
export async function withTransaction(fn) {
  const client = await requirePool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
