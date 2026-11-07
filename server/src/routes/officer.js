// /api/officer: Local Tourism Officer portal. Officers only see nominations in their jurisdictions.
//   GET  /api/officer/submissions?q=           screened nominations waiting for a decision
//   GET  /api/officer/reviewed?status=         nominations this officer decided on
//   GET  /api/officer/submissions/:id          details, photos, checklist
//   PUT  /api/officer/submissions/:id/checklist   save the checklist as a draft
//   POST /api/officer/submissions/:id/decision    { decision, remarks, seasonTag, criteria }
// The first decision wins: once one officer decides, the nomination leaves everyone's queue.
import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { badRequest, conflict, notFound } from '../errors.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { findKnownDestinations } from '../lib/screening.js';
import { likePattern } from '../lib/sql.js';
import { validate } from '../lib/validate.js';
import { requireRole } from '../middleware/auth.js';
import { notify } from '../services/notifications.js';

const router = Router();
router.use(requireRole('tourism_officer'));

const REVIEW_COUNT_LIMIT = 5; // per platform, agreed with ACTOP
const idParam = z.object({ id: z.coerce.number().int().positive() });
const IN_MY_TOWNS = `d.jurisdiction_id IN (SELECT jurisdiction_id FROM officer_jurisdictions WHERE officer_id = $1)`;

const LIST_COLUMNS = `
  d.destination_id, d.name, d.description, d.location, d.workflow_status, d.season_tag, j.name AS jurisdiction,
  ARRAY(SELECT c.category_name FROM destination_categories dc JOIN categories c USING (category_id)
        WHERE dc.destination_id = d.destination_id ORDER BY c.category_id)::text[] AS categories,
  (SELECT image_url FROM destination_images i WHERE i.destination_id = d.destination_id
   AND i.review_id IS NULL ORDER BY is_primary DESC, created_at LIMIT 1) AS photo,
  (SELECT max(verified_at) FROM admin_verification_logs v WHERE v.destination_id = d.destination_id
   AND v.verification_status = 'verified') AS screened_at`;

const listOut = (d) => ({
  id: d.destination_id,
  name: d.name,
  description: d.description,
  location: d.location,
  status: d.workflow_status,
  season: d.season_tag,
  jurisdiction: d.jurisdiction,
  categories: d.categories,
  photo: d.photo,
  screenedAt: d.screened_at,
  decidedAt: d.decided_at,
  hasDraft: d.has_draft,
});

router.get(
  '/submissions',
  asyncRoute(async (req, res) => {
    const { q } = validate(z.object({ q: z.string().trim().max(100).optional() }), req.query);
    const { rows } = await query(
      `SELECT ${LIST_COLUMNS},
         EXISTS (SELECT 1 FROM destination_criteria dc WHERE dc.destination_id = d.destination_id
                 AND dc.is_draft AND dc.assessed_by = $1) AS has_draft
       FROM destinations d JOIN jurisdictions j USING (jurisdiction_id)
       WHERE d.workflow_status = 'pending_endorsement' AND ${IN_MY_TOWNS}
         AND ($2::text IS NULL OR d.name ILIKE $2)
       ORDER BY screened_at NULLS FIRST, d.destination_id`,
      [req.user.user_id, q ? likePattern(q) : null],
    );
    res.json({ submissions: rows.map(listOut) });
  }),
);

router.get(
  '/reviewed',
  asyncRoute(async (req, res) => {
    const { status } = validate(
      z.object({
        status: z.enum(['all', 'endorsed', 'returned', 'rejected']).optional().default('all'),
      }),
      req.query,
    );
    const { rows } = await query(
      `SELECT ${LIST_COLUMNS}, e.endorsement_status, e.endorsed_at AS decided_at
       FROM destinations d JOIN jurisdictions j USING (jurisdiction_id)
       JOIN LATERAL (SELECT endorsement_status, endorsed_at FROM endorsement_logs el
                     WHERE el.destination_id = d.destination_id AND el.tourism_officer_id = $1
                     ORDER BY endorsed_at DESC LIMIT 1) e ON true
       WHERE ($2 = 'all' OR e.endorsement_status = $2)
       ORDER BY e.endorsed_at DESC LIMIT 300`,
      [req.user.user_id, status],
    );
    res.json({
      reviewed: rows.map((d) => ({ ...listOut(d), decision: d.endorsement_status })),
    });
  }),
);

// Loads a nomination in one of the officer's jurisdictions, or 404.
async function loadMine(db, id, officerId, lock = false) {
  const { rows } = await db.query(
    `SELECT d.*, j.name AS jurisdiction FROM destinations d JOIN jurisdictions j USING (jurisdiction_id)
     WHERE d.destination_id = $2 AND ${IN_MY_TOWNS} ${lock ? 'FOR UPDATE OF d' : ''}`,
    [officerId, id],
  );
  if (!rows[0]) throw notFound('This submission is not in your jurisdiction.');
  return rows[0];
}

router.get(
  '/submissions/:id',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const d = await loadMine({ query }, id, req.user.user_id);
    if (d.workflow_status === 'draft' || d.workflow_status === 'pending_verification') {
      throw notFound('This submission has not been screened yet.');
    }
    const [categories, photos, criteria, people, decision, known] = await Promise.all([
      query(
        `SELECT c.category_name FROM destination_categories dc JOIN categories c USING (category_id)
         WHERE dc.destination_id = $1 ORDER BY c.category_id`,
        [id],
      ),
      query(
        `SELECT image_id, image_url, is_primary FROM destination_images
         WHERE destination_id = $1 AND review_id IS NULL AND moderation_status IN ('approved', 'pending')
         ORDER BY is_primary DESC, created_at`,
        [id],
      ),
      query(
        `SELECT c.criterion_id, c.criterion_name, c.description, dc.assessment_status, dc.notes,
           dc.google_maps_review_count, dc.tripadvisor_review_count, dc.observed_at, dc.is_draft
         FROM classification_criteria c
         LEFT JOIN destination_criteria dc ON dc.criterion_id = c.criterion_id AND dc.destination_id = $1
         ORDER BY c.criterion_id`,
        [id],
      ),
      query(
        `SELECT (SELECT full_name FROM users WHERE user_id = $2) AS submitted_by,
           (SELECT u.full_name FROM admin_verification_logs v JOIN users u ON u.user_id = v.administrator_id
            WHERE v.destination_id = $1 AND v.verification_status = 'verified' ORDER BY v.verified_at DESC LIMIT 1) AS screened_by,
           (SELECT max(verified_at) FROM admin_verification_logs WHERE destination_id = $1
            AND verification_status = 'verified') AS screened_at`,
        [id, d.submitted_by],
      ),
      query(
        `SELECT e.endorsement_status, e.remarks, e.endorsed_at, u.full_name
         FROM endorsement_logs e JOIN users u ON u.user_id = e.tourism_officer_id
         WHERE e.destination_id = $1 ORDER BY e.endorsed_at DESC LIMIT 1`,
        [id],
      ),
      findKnownDestinations({ name: d.name, jurisdictionId: d.jurisdiction_id }),
    ]);
    const p = people.rows[0];
    const last = decision.rows[0];
    res.json({
      id: d.destination_id,
      name: d.name,
      status: d.workflow_status,
      jurisdiction: d.jurisdiction,
      location: d.location,
      latitude: Number(d.latitude),
      longitude: Number(d.longitude),
      description: d.description,
      entranceFee: d.entrance_fee,
      bestTimeToVisit: d.best_time_to_visit,
      operatingHours: d.operating_hours,
      safetyReminders: d.safety_reminders,
      seasonTag: d.season_tag,
      categories: categories.rows.map((c) => c.category_name),
      photos: photos.rows.map((r) => ({
        id: r.image_id,
        url: r.image_url,
        isPrimary: r.is_primary,
      })),
      submittedBy: p.submitted_by,
      submittedAt: d.created_at,
      screenedBy: p.screened_by,
      screenedAt: p.screened_at,
      criteria: criteria.rows.map((c) => ({
        id: c.criterion_id,
        name: c.criterion_name,
        description: c.description,
        status: c.assessment_status || 'not_assessed',
        notes: c.notes || '',
        googleMapsReviews: c.google_maps_review_count,
        tripadvisorReviews: c.tripadvisor_review_count,
        observedAt: c.observed_at,
        draft: c.is_draft ?? null,
      })),
      knownMatches: known,
      decision: last
        ? {
            status: last.endorsement_status,
            remarks: last.remarks,
            at: last.endorsed_at,
            by: last.full_name,
          }
        : null,
    });
  }),
);

const countField = z
  .union([z.coerce.number().int().min(0).max(1000000), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));
const criterionSchema = z.object({
  id: z.coerce.number().int().min(1).max(3),
  status: z.enum(['not_assessed', 'met', 'not_met']),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => v || null),
  googleMapsReviews: countField,
  tripadvisorReviews: countField,
  observedAt: z
    .union([z.iso.date(), z.literal(''), z.null()])
    .optional()
    .transform((v) => v || null),
});
const checklistSchema = z.object({
  criteria: z.array(criterionSchema).length(3, 'Fill in all three criteria.'),
  seasonTag: z.enum(['Rainy', 'Summer']).nullable().optional(),
});

async function saveCriteria(db, id, officerId, criteria, draft) {
  for (const c of criteria) {
    const first = c.id === 1;
    await db.query(
      `INSERT INTO destination_criteria (destination_id, criterion_id, notes, assessment_status,
         google_maps_review_count, tripadvisor_review_count, observed_at, assessed_by, assessed_at, is_draft)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), $9)
       ON CONFLICT (destination_id, criterion_id) DO UPDATE SET notes = EXCLUDED.notes,
         assessment_status = EXCLUDED.assessment_status,
         google_maps_review_count = EXCLUDED.google_maps_review_count,
         tripadvisor_review_count = EXCLUDED.tripadvisor_review_count,
         observed_at = EXCLUDED.observed_at, assessed_by = EXCLUDED.assessed_by,
         assessed_at = EXCLUDED.assessed_at, is_draft = EXCLUDED.is_draft`,
      [
        id,
        c.id,
        c.notes,
        c.status,
        first ? c.googleMapsReviews : null,
        first ? c.tripadvisorReviews : null,
        c.observedAt,
        officerId,
        draft,
      ],
    );
  }
}

function assertOpen(d) {
  if (d.workflow_status !== 'pending_endorsement') {
    throw conflict('Another officer has already decided on this submission.');
  }
}

router.put(
  '/submissions/:id/checklist',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const d = validate(checklistSchema, req.body);
    await withTransaction(async (db) => {
      assertOpen(await loadMine(db, id, req.user.user_id, true));
      await saveCriteria(db, id, req.user.user_id, d.criteria, true);
    });
    res.json({ id, saved: true });
  }),
);

router.post(
  '/submissions/:id/decision',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const d = validate(
      checklistSchema.extend({
        decision: z.enum(['endorsed', 'returned', 'rejected'], { error: 'Choose a decision.' }),
        remarks: z
          .string()
          .trim()
          .max(2000)
          .optional()
          .transform((v) => v || ''),
      }),
      req.body,
    );
    if (d.decision === 'endorsed') {
      if (!d.criteria.every((c) => c.status === 'met')) {
        throw badRequest('All three criteria must be met to endorse.');
      }
      const first = d.criteria.find((c) => c.id === 1);
      if (
        first.googleMapsReviews === null ||
        first.tripadvisorReviews === null ||
        !first.observedAt
      ) {
        throw badRequest('Record both review counts and the date you checked them.');
      }
      if (
        first.googleMapsReviews > REVIEW_COUNT_LIMIT ||
        first.tripadvisorReviews > REVIEW_COUNT_LIMIT
      ) {
        throw badRequest(
          `More than ${REVIEW_COUNT_LIMIT} reviews on a platform does not meet the first criterion.`,
        );
      }
    } else if (d.remarks.length < 5) {
      throw badRequest('Write remarks so the submitter knows what to fix or why.');
    }

    await withTransaction(async (db) => {
      const dest = await loadMine(db, id, req.user.user_id, true);
      assertOpen(dest);
      await saveCriteria(db, id, req.user.user_id, d.criteria, false);
      await db.query(
        `UPDATE destinations SET workflow_status = $2, season_tag = $3 WHERE destination_id = $1`,
        [id, d.decision, d.decision === 'endorsed' ? d.seasonTag || null : dest.season_tag],
      );
      await db.query(
        `INSERT INTO endorsement_logs (destination_id, tourism_officer_id, endorsement_status, remarks)
         VALUES ($1, $2, $3, $4)`,
        [id, req.user.user_id, d.decision, d.remarks || null],
      );
      if (dest.submitted_by) {
        const messages = {
          endorsed: `Good news: "${dest.name}" was endorsed and is now public on Sulyap.`,
          returned: `Your nomination "${dest.name}" was returned by the Local Tourism Officer: ${d.remarks}`,
          rejected: `Your nomination "${dest.name}" was not endorsed: ${d.remarks}`,
        };
        await notify(db, {
          userId: dest.submitted_by,
          type: d.decision === 'endorsed' ? 'endorsement' : d.decision,
          message: messages[d.decision],
        });
      }
    });
    res.json({ id, status: d.decision });
  }),
);

export default router;
