// The automatic checks run on nominations and reviews:
//   prohibited terms  -> the post is blocked
//   duplicates        -> a warning with links; the user may submit anyway
//   already promoted  -> a warning (the Local Tourism Officer still decides)
import { query } from '../db/pool.js';

const TERMS_TTL_MS = 60 * 1000;
const SIMILARITY = 0.5;

// Common look-alike characters used to hide a word, such as "b4d" or "$hit".
const LOOKALIKES = { 4: 'a', '@': 'a', 3: 'e', 1: 'i', '!': 'i', 0: 'o', 5: 's', $: 's', 7: 't' };

// Lowercases, removes accents, swaps look-alike characters, and turns everything that is not a
// letter or digit into single spaces, so whole words can be compared.
export function normalize(text) {
  return ` ${String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[4@3!10$57]/g, (ch) => LOOKALIKES[ch])
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

let cache = { at: 0, terms: [] };
async function prohibitedTerms() {
  if (Date.now() - cache.at < TERMS_TTL_MS) return cache.terms;
  const { rows } = await query('SELECT term FROM prohibited_terms');
  const terms = rows
    .map((r) => ({ term: r.term, normalized: normalize(r.term) }))
    // Terms with no letters or digits (an emoji) are matched as they are.
    .map((t) => (t.normalized.trim() ? t : { ...t, raw: true }));
  cache = { at: Date.now(), terms };
  return terms;
}

// Call after the administrator edits the list (Phase B4).
export function forgetProhibitedTerms() {
  cache = { at: 0, terms: [] };
}

// Returns the prohibited terms found in any of the texts, as whole words or phrases.
export async function findProhibitedTerms(texts) {
  const joined = texts.filter(Boolean).join(' \n ');
  const normalized = normalize(joined);
  const found = new Set();
  for (const t of await prohibitedTerms()) {
    if (t.raw ? joined.includes(t.term) : normalized.includes(t.normalized)) found.add(t.term);
  }
  return [...found];
}

// Name match used by both lists: similar spelling, or one name contained in the other
// ("Candaba Swamp" inside "Candaba Swamp Birding Deck").
// Generic words ("Falls", "Hot Spring", "Church") are left out first, so two different waterfalls
// in the same town are not reported as duplicates just because both are called "... Falls".
const GENERIC = [
  'falls',
  'fall',
  'spring',
  'springs',
  'hot',
  'resort',
  'church',
  'parish',
  'park',
  'river',
  'lake',
  'mount',
  'mt',
  'beach',
  'farm',
  'garden',
  'gardens',
  'cave',
  'trail',
  'view',
  'deck',
  'museum',
  'house',
  'festival',
  'swamp',
  'bridge',
  'hill',
  'hills',
  'sitio',
  'barangay',
  'brgy',
  'the',
  'of',
  'and',
  'ng',
  'sa',
  'at',
];
const STRIP = `\\m(${GENERIC.join('|')})\\M`;
const core = (expr) => `btrim(regexp_replace(lower(${expr}), '${STRIP}', '', 'g'))`;
const NAME_MATCH = `CASE WHEN ${core('name')} = '' OR ${core('$1')} = ''
    THEN similarity(lower(name), lower($1))
    ELSE GREATEST(similarity(${core('name')}, ${core('$1')}),
      word_similarity(${core('name')}, ${core('$1')}), word_similarity(${core('$1')}, ${core('name')}))
  END`;

// Other nominations or destinations with a similar name in the same city or municipality.
// Drafts and rejected nominations do not count.
export async function findDuplicates({ name, jurisdictionId, excludeId = null }) {
  const { rows } = await query(
    `SELECT destination_id, name, workflow_status, ${NAME_MATCH} AS score
     FROM destinations
     WHERE jurisdiction_id = $2 AND workflow_status NOT IN ('draft', 'rejected')
       AND ($3::int IS NULL OR destination_id <> $3)
       AND ${NAME_MATCH} >= $4
     ORDER BY score DESC LIMIT 5`,
    [name, jurisdictionId, excludeId, SIMILARITY],
  );
  return rows.map((r) => ({
    id: r.destination_id,
    name: r.name,
    // Only endorsed destinations have a public page to link to.
    endorsed: r.workflow_status === 'endorsed',
  }));
}

// Entries on the already-promoted list with a similar name in the same city or municipality.
export async function findKnownDestinations({ name, jurisdictionId }) {
  const { rows } = await query(
    `SELECT known_destination_id, name, source, ${NAME_MATCH} AS score
     FROM known_destinations
     WHERE jurisdiction_id = $2 AND ${NAME_MATCH} >= $3
     ORDER BY score DESC LIMIT 5`,
    [name, jurisdictionId, SIMILARITY],
  );
  return rows.map((r) => ({ id: r.known_destination_id, name: r.name, source: r.source }));
}
