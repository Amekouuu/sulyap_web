// Loads the researched screening lists (screening/*.csv) used by the automatic nomination checks.
// Safe to run again: entries already in the database are skipped.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screening');
const ADMIN_EMAIL = 'admin@sulyap.site';
const LANGUAGES = ['english', 'filipino', 'kapampangan'];

// Reads a small CSV file with a header row. Supports "quoted, fields" and "" inside quotes.
export function readCsv(file) {
  const text = fs.readFileSync(path.join(DIR, file), 'utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((cells) =>
    Object.fromEntries(header.map((name, i) => [name.trim(), (cells[i] || '').trim()])),
  );
}

export async function seedScreening(db, { log = console.log } = {}) {
  const admin = (await db.query('SELECT user_id FROM users WHERE lower(email) = $1', [ADMIN_EMAIL]))
    .rows[0]?.user_id;
  if (!admin) throw new Error(`Run the base seed first (${ADMIN_EMAIL} is missing).`);
  const towns = Object.fromEntries(
    (await db.query('SELECT jurisdiction_id, name FROM jurisdictions')).rows.map((r) => [
      r.name,
      r.jurisdiction_id,
    ]),
  );

  let places = 0;
  for (const row of readCsv('known-destinations.csv')) {
    const town = towns[row.jurisdiction];
    if (!town)
      throw new Error(`Unknown city or municipality "${row.jurisdiction}" for ${row.name}.`);
    const exists = await db.query(
      'SELECT 1 FROM known_destinations WHERE lower(name) = lower($1) AND jurisdiction_id = $2',
      [row.name, town],
    );
    if (exists.rows.length) continue;
    await db.query(
      'INSERT INTO known_destinations (name, jurisdiction_id, source, added_by) VALUES ($1, $2, $3, $4)',
      [row.name, town, row.source.slice(0, 255), admin],
    );
    places += 1;
  }

  let terms = 0;
  for (const row of readCsv('prohibited-terms.csv')) {
    if (!LANGUAGES.includes(row.language)) throw new Error(`Unknown language "${row.language}".`);
    const result = await db.query(
      `INSERT INTO prohibited_terms (term, language, added_by) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING RETURNING term_id`,
      [row.term, row.language, admin],
    );
    terms += result.rows.length;
  }
  log(`Screening lists: added ${places} known destinations and ${terms} prohibited terms.`);
}
