// Loads the TEST-ONLY demo data from demo-data.js. Requires the base seed first.
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from './base.js';
import {
  DEMO_DESTINATIONS,
  DEMO_EMAIL_DOMAIN,
  DEMO_KNOWN_DESTINATIONS,
  DEMO_KNOWN_SOURCE,
  DEMO_PROHIBITED_TERMS,
  DEMO_REPORTS,
  DEMO_REVIEWS,
  DEMO_TEST_OFFICERS,
  DEMO_USERS,
} from './demo-data.js';

const ADMIN_EMAIL = 'admin@sulyap.site';
const OFFICER_EMAIL = 'lto.main@sulyap.site';
const ID_SAMPLE_URL = '/demo/id-sample.svg';

const at = (date, time = '09:00') => `${date}T${time}:00+08:00`;
const photoUrl = (file) => (file ? `/demo/${file}.jpg` : '/demo/placeholder.svg');

async function lookup(db, sql, keyColumn) {
  const { rows } = await db.query(sql);
  return Object.fromEntries(rows.map((row) => [row[keyColumn], row.id]));
}

export async function seedDemo(db, { demoPassword, log = console.log }) {
  if (!demoPassword || demoPassword.length < 8) {
    throw new Error('SEED_DEMO_PASSWORD must be set and at least 8 characters long.');
  }
  const already = await db.query(
    'SELECT count(*)::int AS n FROM users WHERE lower(email) LIKE $1',
    ['%' + DEMO_EMAIL_DOMAIN],
  );
  if (already.rows[0].n > 0) {
    throw new Error('Demo data is already loaded. Run "npm run db:clear:demo" first.');
  }

  const towns = await lookup(db, 'SELECT jurisdiction_id AS id, name FROM jurisdictions', 'name');
  const categories = await lookup(
    db,
    'SELECT category_id AS id, category_name FROM categories',
    'category_name',
  );
  const staff = await lookup(db, 'SELECT user_id AS id, email FROM users', 'email');
  const admin = staff[ADMIN_EMAIL];
  const officer = staff[OFFICER_EMAIL];
  if (!officer || !admin) {
    throw new Error('Staff accounts are missing. Run "npm run db:seed" first.');
  }

  // One shared hash is fine for throwaway test accounts.
  const passwordHash = await bcrypt.hash(demoPassword, BCRYPT_COST);

  for (const o of DEMO_TEST_OFFICERS) {
    const { rows } = await db.query(
      `INSERT INTO users (full_name, email, email_verified, email_verified_at, password_hash, role)
       VALUES ($1, $2, true, now(), $3, 'tourism_officer')
       RETURNING user_id`,
      [o.fullName, o.email, passwordHash],
    );
    await db.query(
      `INSERT INTO officer_jurisdictions (officer_id, jurisdiction_id)
       SELECT $1, jurisdiction_id FROM jurisdictions WHERE name = ANY ($2::text[])`,
      [rows[0].user_id, o.jurisdictions],
    );
  }

  const users = {};
  for (const u of DEMO_USERS) {
    const decided = u.idStatus !== 'pending';
    const { rows } = await db.query(
      `INSERT INTO users (full_name, email, email_verified, email_verified_at, contact_number, home_address,
         address_latitude, address_longitude, id_type, id_document_url, account_verification_status,
         verified_by, verified_at, password_hash, role, account_status, created_at, updated_at)
       VALUES ($1, $2, true, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'registered_user', $14, $3, $3)
       RETURNING user_id`,
      [
        u.name,
        u.email,
        at(u.registered),
        u.phone,
        u.address,
        u.home[0],
        u.home[1],
        u.idType,
        // Decided IDs were deleted 24 hours after the decision, so only pending ones keep an image.
        decided ? null : ID_SAMPLE_URL,
        u.idStatus,
        decided ? admin : null,
        decided ? at(u.idDate, '15:00') : null,
        passwordHash,
        u.suspended ? 'suspended' : 'active',
      ],
    );
    users[u.key] = rows[0].user_id;
  }

  const destinations = {};
  for (const d of DEMO_DESTINATIONS) {
    const lastEvent = d.decided || d.screened || d.submitted;
    const { rows } = await db.query(
      `INSERT INTO destinations (jurisdiction_id, submitted_by, name, description, season_tag, location,
         latitude, longitude, entrance_fee, best_time_to_visit, operating_hours, safety_reminders,
         workflow_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING destination_id`,
      [
        towns[d.town],
        users[d.by],
        d.name,
        d.desc,
        d.season,
        d.location,
        d.lat,
        d.lng,
        d.fee,
        d.best,
        d.hours || null,
        d.safety,
        d.status,
        at(d.submitted),
        at(lastEvent, '16:00'),
      ],
    );
    const id = rows[0].destination_id;
    destinations[d.key] = id;

    for (const cat of d.cats) {
      await db.query(
        'INSERT INTO destination_categories (destination_id, category_id) VALUES ($1, $2)',
        [id, categories[cat]],
      );
    }

    if (d.status !== 'draft') {
      const photoStatus = d.status === 'pending_verification' ? 'pending' : 'approved';
      await db.query(
        `INSERT INTO destination_images (destination_id, user_id, is_primary, image_url, moderation_status, created_at)
         VALUES ($1, $2, true, $3, $4, $5)`,
        [id, users[d.by], photoUrl(d.photo), photoStatus, at(d.submitted)],
      );
    }

    if (d.screened) {
      await db.query(
        `INSERT INTO admin_verification_logs (destination_id, administrator_id, verification_status, verified_at)
         VALUES ($1, $2, 'verified', $3)`,
        [id, admin, at(d.screened, '10:00')],
      );
    }

    if (d.decided) {
      await db.query(
        `INSERT INTO endorsement_logs (destination_id, tourism_officer_id, endorsement_status, remarks, endorsed_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, officer, d.status, d.remarks || null, at(d.decided, '14:00')],
      );
    }

    if (d.status === 'endorsed' || d.criteria) {
      const results = d.criteria || ['met', 'met', 'met'];
      for (let i = 0; i < results.length; i += 1) {
        const isReviewCount = i === 0;
        await db.query(
          `INSERT INTO destination_criteria (destination_id, criterion_id, notes, assessment_status,
             google_maps_review_count, tripadvisor_review_count, observed_at, assessed_by, assessed_at, is_draft)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)`,
          [
            id,
            i + 1,
            'Checked during the demo endorsement review.',
            results[i],
            isReviewCount ? d.counts[0] : null,
            isReviewCount ? d.counts[1] : null,
            d.decided,
            officer,
            at(d.decided, '13:00'),
          ],
        );
      }
    }
  }

  const reviews = {};
  const photos = {};
  for (const r of DEMO_REVIEWS) {
    const { rows } = await db.query(
      `INSERT INTO reviews (destination_id, user_id, rating, review_text, moderation_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6)
       RETURNING review_id`,
      [destinations[r.dest], users[r.by], r.rating, r.text, r.status, at(r.date, '11:00')],
    );
    reviews[r.key] = rows[0].review_id;
    for (const p of r.photos || []) {
      const image = await db.query(
        `INSERT INTO destination_images (destination_id, user_id, review_id, image_url, caption, moderation_status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING image_id`,
        [
          destinations[r.dest],
          users[r.by],
          reviews[r.key],
          photoUrl(p.file),
          p.caption,
          p.status,
          at(r.date, '11:00'),
        ],
      );
      photos[p.key] = image.rows[0].image_id;
    }
  }

  for (const rep of DEMO_REPORTS) {
    await db.query(
      `INSERT INTO reports (reported_by, review_id, image_id, destination_id, reason, report_status,
         created_at, resolved_at, resolved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        users[rep.by],
        rep.kind === 'review' ? reviews[rep.target] : null,
        rep.kind === 'image' ? photos[rep.target] : null,
        rep.kind === 'destination' ? destinations[rep.target] : null,
        rep.reason,
        rep.status,
        at(rep.date, '12:00'),
        rep.resolved ? at(rep.resolved, '17:00') : null,
        rep.resolved ? admin : null,
      ],
    );
  }

  for (const k of DEMO_KNOWN_DESTINATIONS) {
    await db.query(
      'INSERT INTO known_destinations (name, jurisdiction_id, source, added_by) VALUES ($1, $2, $3, $4)',
      [k.name, towns[k.town], DEMO_KNOWN_SOURCE, admin],
    );
  }
  for (const t of DEMO_PROHIBITED_TERMS) {
    await db.query(
      'INSERT INTO prohibited_terms (term, language, added_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [t.term, t.language, admin],
    );
  }

  log(
    `Demo data loaded: ${DEMO_USERS.length} users, ${DEMO_TEST_OFFICERS.length} test officers, ` +
      `${DEMO_DESTINATIONS.length} destinations, ` +
      `${DEMO_REVIEWS.length} reviews, ${DEMO_REPORTS.length} reports.`,
  );
}
