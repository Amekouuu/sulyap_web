// Required setup data: jurisdictions, categories, classification criteria, and staff accounts.
// Safe to run more than once: existing rows are left untouched (passwords are never overwritten).
import bcrypt from 'bcryptjs';
import {
  CATEGORIES,
  CRITERIA,
  JURISDICTIONS,
  PROVINCE,
  STAFF_ACCOUNTS,
} from '../reference-data.js';

export const BCRYPT_COST = 12;

export async function seedBase(db, { staffPassword, log = console.log }) {
  if (!staffPassword || staffPassword.length < 12) {
    throw new Error('SEED_STAFF_PASSWORD must be set and at least 12 characters long.');
  }

  for (const j of JURISDICTIONS) {
    await db.query(
      `INSERT INTO jurisdictions (name, type, province) VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING`,
      [j.name, j.type, PROVINCE],
    );
  }

  for (const c of CATEGORIES) {
    await db.query(
      `INSERT INTO categories (category_name, description) VALUES ($1, $2)
       ON CONFLICT (category_name) DO NOTHING`,
      [c.name, c.description],
    );
  }

  for (const c of CRITERIA) {
    await db.query(
      `INSERT INTO classification_criteria (criterion_id, criterion_name, description) VALUES ($1, $2, $3)
       ON CONFLICT (criterion_id) DO NOTHING`,
      [c.id, c.name, c.description],
    );
  }
  // Explicit ids were used above, so move the id counter past them.
  await db.query(
    `SELECT setval(pg_get_serial_sequence('classification_criteria', 'criterion_id'),
                   (SELECT MAX(criterion_id) FROM classification_criteria))`,
  );

  let created = 0;
  for (const account of STAFF_ACCOUNTS) {
    const existing = await db.query('SELECT user_id FROM users WHERE lower(email) = lower($1)', [
      account.email,
    ]);
    let userId = existing.rows[0]?.user_id;
    if (!userId) {
      const passwordHash = await bcrypt.hash(staffPassword, BCRYPT_COST);
      const inserted = await db.query(
        `INSERT INTO users (full_name, email, email_verified, email_verified_at, password_hash, role)
         VALUES ($1, lower($2), true, now(), $3, $4)
         RETURNING user_id`,
        [account.fullName, account.email, passwordHash, account.role],
      );
      userId = inserted.rows[0].user_id;
      created += 1;
    }
    if (account.role === 'tourism_officer') {
      const names = account.jurisdictions === 'all' ? null : account.jurisdictions;
      await db.query(
        `INSERT INTO officer_jurisdictions (officer_id, jurisdiction_id)
         SELECT $1, jurisdiction_id FROM jurisdictions
         WHERE $2::text[] IS NULL OR name = ANY ($2::text[])
         ON CONFLICT DO NOTHING`,
        [userId, names],
      );
    }
  }

  log(
    `Base data ready: ${JURISDICTIONS.length} jurisdictions, ${CATEGORIES.length} categories, ` +
      `${CRITERIA.length} criteria, ${created} new staff account(s).`,
  );
}
