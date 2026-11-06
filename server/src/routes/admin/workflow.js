// Administrator: dashboard, nomination screening and routing, and reports.
//   GET  /api/admin/dashboard
//   GET  /api/admin/destinations?status=            submitted nominations and destinations
//   GET  /api/admin/destinations/:id                read-only record, workflow history, checks
//   POST /api/admin/destinations/:id/screen         { decision: route|returned|rejected, remarks }
//   POST /api/admin/destinations/:id/pull           { status: returned|rejected, remarks } (endorsed)
//   GET  /api/admin/reports?status=   GET /api/admin/reports/:id
//   POST /api/admin/reports/:id/close               { status: under_review|resolved|dismissed, removeContent }
import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../../db/pool.js';
import { badRequest, conflict, notFound } from '../../errors.js';
import { asyncRoute } from '../../lib/asyncRoute.js';
import { findDuplicates, findKnownDestinations, findProhibitedTerms } from '../../lib/screening.js';
import { likePattern } from '../../lib/sql.js';
import { validate } from '../../lib/validate.js';
import { notify } from '../../services/notifications.js';

const router = Router();
const idParam = z.object({ id: z.coerce.number().int().positive() });
const STATUSES = [
  'pending_verification',
  'returned',
  'pending_endorsement',
  'endorsed',
  'rejected',
];
const remarksField = (min) =>
  z
    .string()
    .trim()
    .max(2000, 'Keep the remarks under 2000 characters.')
    .optional()
    .transform((v) => v || '')
    .refine((v) => v.length >= min, { message: 'Write remarks so the submitter knows why.' });

const countBy = (rows, key = 'status') =>
  Object.fromEntries(rows.map((r) => [r[key], Number(r.n)]));

// ------------------------------------------------------------------ Dashboard
router.get(
  '/dashboard',
  asyncRoute(async (req, res) => {
    const [statuses, community, reports, ids, latest, endorsed, activity, categories] =
      await Promise.all([
        query(
          `SELECT workflow_status AS status, count(*) AS n FROM destinations
           WHERE workflow_status <> 'draft' GROUP BY 1`,
        ),
        query(
          `SELECT (SELECT count(*) FROM reviews WHERE moderation_status IN ('pending', 'flagged'))
            + (SELECT count(*) FROM destination_images WHERE review_id IS NOT NULL
               AND moderation_status IN ('pending', 'flagged')) AS n,
            (SELECT count(*) FROM reviews) + (SELECT count(*) FROM destination_images
               WHERE review_id IS NOT NULL) AS total`,
        ),
        query(
          `SELECT count(*) AS n FROM reports WHERE report_status IN ('pending', 'under_review')`,
        ),
        query(`SELECT count(*) AS n FROM users WHERE account_verification_status = 'pending'`),
        query(
          `SELECT d.destination_id, d.name, d.workflow_status, d.created_at, j.name AS jurisdiction,
             u.full_name AS submitted_by,
             (SELECT image_url FROM destination_images i WHERE i.destination_id = d.destination_id
              AND i.review_id IS NULL ORDER BY is_primary DESC, created_at LIMIT 1) AS photo,
             (SELECT c.category_name FROM destination_categories dc JOIN categories c USING (category_id)
              WHERE dc.destination_id = d.destination_id ORDER BY c.category_id LIMIT 1) AS category
           FROM destinations d JOIN jurisdictions j USING (jurisdiction_id)
           LEFT JOIN users u ON u.user_id = d.submitted_by
           WHERE d.workflow_status <> 'draft' ORDER BY d.created_at DESC LIMIT 3`,
        ),
        query(
          `SELECT d.destination_id, d.name, d.season_tag, el.endorsed_at, o.full_name AS officer,
             (SELECT image_url FROM destination_images i WHERE i.destination_id = d.destination_id
              AND i.review_id IS NULL AND i.moderation_status = 'approved'
              ORDER BY is_primary DESC, created_at LIMIT 1) AS photo
           FROM destinations d
           JOIN LATERAL (SELECT endorsed_at, tourism_officer_id FROM endorsement_logs e
                         WHERE e.destination_id = d.destination_id AND e.endorsement_status = 'endorsed'
                         ORDER BY endorsed_at DESC LIMIT 1) el ON true
           JOIN users o ON o.user_id = el.tourism_officer_id
           WHERE d.workflow_status = 'endorsed' ORDER BY el.endorsed_at DESC LIMIT 3`,
        ),
        query(
          `SELECT * FROM (
             SELECT 'review' AS kind, r.created_at AS at, d.name AS place, u.full_name AS who, r.review_id AS ref
             FROM reviews r JOIN destinations d USING (destination_id) JOIN users u ON u.user_id = r.user_id
             UNION ALL
             SELECT 'photo', i.created_at, d.name, u.full_name, i.image_id
             FROM destination_images i JOIN destinations d USING (destination_id) JOIN users u ON u.user_id = i.user_id
             WHERE i.review_id IS NOT NULL
             UNION ALL
             SELECT 'report', p.created_at, NULL, u.full_name, p.report_id
             FROM reports p JOIN users u ON u.user_id = p.reported_by
             UNION ALL
             SELECT 'screened', v.verified_at, d.name, NULL, d.destination_id
             FROM admin_verification_logs v JOIN destinations d USING (destination_id)
             UNION ALL
             SELECT 'endorsement', e.endorsed_at, d.name, u.full_name, d.destination_id
             FROM endorsement_logs e JOIN destinations d USING (destination_id) JOIN users u ON u.user_id = e.tourism_officer_id
           ) x ORDER BY at DESC LIMIT 8`,
        ),
        query(
          `SELECT c.category_name AS name, count(d.destination_id)::int AS n
           FROM categories c LEFT JOIN destination_categories dc ON dc.category_id = c.category_id
           LEFT JOIN destinations d ON d.destination_id = dc.destination_id AND d.workflow_status <> 'draft'
           GROUP BY c.category_id, c.category_name ORDER BY c.category_id`,
        ),
      ]);
    res.json({
      statuses: countBy(statuses.rows),
      moderationQueue: Number(community.rows[0].n),
      communityTotal: Number(community.rows[0].total),
      openReports: Number(reports.rows[0].n),
      pendingIds: Number(ids.rows[0].n),
      latest: latest.rows.map((d) => ({
        id: d.destination_id,
        name: d.name,
        status: d.workflow_status,
        jurisdiction: d.jurisdiction,
        submittedAt: d.created_at,
        submittedBy: d.submitted_by,
        photo: d.photo,
        categories: d.category ? [d.category] : [],
      })),
      endorsed: endorsed.rows.map((d) => ({
        id: d.destination_id,
        name: d.name,
        season: d.season_tag,
        endorsedAt: d.endorsed_at,
        officer: d.officer,
        photo: d.photo,
        categories: [],
      })),
      activity: activity.rows,
      categories: categories.rows,
    });
  }),
);

// GET /api/admin/counts: items waiting for action, shown next to the menu items.
router.get(
  '/counts',
  asyncRoute(async (req, res) => {
    const { rows } = await query(
      `SELECT
         (SELECT count(*)::int FROM destinations WHERE workflow_status = 'pending_verification') AS destinations,
         (SELECT count(*)::int FROM reviews WHERE moderation_status IN ('pending', 'flagged'))
           + (SELECT count(*)::int FROM destination_images WHERE review_id IS NOT NULL
              AND moderation_status IN ('pending', 'flagged')) AS community,
         (SELECT count(*)::int FROM reports WHERE report_status IN ('pending', 'under_review')) AS reports,
         (SELECT count(*)::int FROM users WHERE account_verification_status = 'pending') AS ids`,
    );
    res.json(rows[0]);
  }),
);

// ------------------------------------------------------------------ Destinations
router.get(
  '/destinations',
  asyncRoute(async (req, res) => {
    const { status, q } = validate(
      z.object({
        status: z
          .enum(['all', ...STATUSES])
          .optional()
          .default('all'),
        q: z.string().trim().max(100).optional(),
      }),
      req.query,
    );
    const { rows } = await query(
      `SELECT d.destination_id, d.name, d.description, d.workflow_status, d.created_at, d.updated_at,
         j.name AS jurisdiction, u.full_name AS submitted_by,
         ARRAY(SELECT c.category_name FROM destination_categories dc JOIN categories c USING (category_id)
               WHERE dc.destination_id = d.destination_id ORDER BY c.category_id)::text[] AS categories,
         (SELECT image_url FROM destination_images i WHERE i.destination_id = d.destination_id
          AND i.review_id IS NULL ORDER BY is_primary DESC, created_at LIMIT 1) AS photo
       FROM destinations d JOIN jurisdictions j USING (jurisdiction_id)
       LEFT JOIN users u ON u.user_id = d.submitted_by
       WHERE d.workflow_status <> 'draft' AND ($1 = 'all' OR d.workflow_status = $1)
         AND ($2::text IS NULL OR d.name ILIKE $2 OR j.name ILIKE $2)
       ORDER BY (d.workflow_status = 'pending_verification') DESC, d.updated_at DESC LIMIT 300`,
      [status, q ? likePattern(q) : null],
    );
    const counts = await query(
      `SELECT workflow_status AS status, count(*) AS n FROM destinations
       WHERE workflow_status <> 'draft' GROUP BY 1`,
    );
    res.json({
      destinations: rows.map((d) => ({
        id: d.destination_id,
        name: d.name,
        description: d.description,
        status: d.workflow_status,
        jurisdiction: d.jurisdiction,
        categories: d.categories,
        submittedBy: d.submitted_by,
        submittedAt: d.created_at,
        updatedAt: d.updated_at,
        photo: d.photo,
      })),
      counts: countBy(counts.rows),
    });
  }),
);

async function officersFor(jurisdictionId, db = { query }) {
  const { rows } = await db.query(
    `SELECT u.user_id, u.full_name FROM officer_jurisdictions oj JOIN users u ON u.user_id = oj.officer_id
     WHERE oj.jurisdiction_id = $1 AND u.account_status = 'active' ORDER BY u.full_name`,
    [jurisdictionId],
  );
  return rows;
}

router.get(
  '/destinations/:id',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const { rows } = await query(
      `SELECT d.*, j.name AS jurisdiction, u.full_name AS submitted_by_name
       FROM destinations d JOIN jurisdictions j USING (jurisdiction_id)
       LEFT JOIN users u ON u.user_id = d.submitted_by
       WHERE d.destination_id = $1 AND d.workflow_status <> 'draft'`,
      [id],
    );
    const d = rows[0];
    if (!d) throw notFound('Destination not found.');
    const [categories, photos, history, criteria, officers, duplicates, known, prohibited] =
      await Promise.all([
        query(
          `SELECT c.category_name FROM destination_categories dc JOIN categories c USING (category_id)
           WHERE dc.destination_id = $1 ORDER BY c.category_id`,
          [id],
        ),
        query(
          `SELECT image_id, image_url, is_primary, moderation_status FROM destination_images
           WHERE destination_id = $1 AND review_id IS NULL ORDER BY is_primary DESC, created_at`,
          [id],
        ),
        query(
          `SELECT * FROM (
             SELECT 'administrator' AS by_role, v.verification_status AS status, v.remarks, v.verified_at AS at, u.full_name AS who
             FROM admin_verification_logs v JOIN users u ON u.user_id = v.administrator_id WHERE v.destination_id = $1
             UNION ALL
             SELECT 'tourism_officer', e.endorsement_status, e.remarks, e.endorsed_at, u.full_name
             FROM endorsement_logs e JOIN users u ON u.user_id = e.tourism_officer_id WHERE e.destination_id = $1
           ) x ORDER BY at`,
          [id],
        ),
        query(
          `SELECT c.criterion_id, c.criterion_name, dc.assessment_status, dc.google_maps_review_count,
             dc.tripadvisor_review_count, dc.notes, dc.is_draft
           FROM destination_criteria dc JOIN classification_criteria c USING (criterion_id)
           WHERE dc.destination_id = $1 ORDER BY c.criterion_id`,
          [id],
        ),
        officersFor(d.jurisdiction_id),
        findDuplicates({ name: d.name, jurisdictionId: d.jurisdiction_id, excludeId: id }),
        findKnownDestinations({ name: d.name, jurisdictionId: d.jurisdiction_id }),
        findProhibitedTerms([
          d.name,
          d.location,
          d.description,
          d.entrance_fee,
          d.best_time_to_visit,
          d.operating_hours,
          d.safety_reminders,
        ]),
      ]);
    res.json({
      id: d.destination_id,
      name: d.name,
      status: d.workflow_status,
      jurisdictionId: d.jurisdiction_id,
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
      submittedBy: d.submitted_by_name,
      submittedAt: d.created_at,
      updatedAt: d.updated_at,
      photos: photos.rows.map((p) => ({
        id: p.image_id,
        url: p.image_url,
        isPrimary: p.is_primary,
        status: p.moderation_status,
      })),
      history: history.rows,
      criteria: criteria.rows.map((c) => ({
        id: c.criterion_id,
        name: c.criterion_name,
        status: c.assessment_status,
        googleMapsReviews: c.google_maps_review_count,
        tripadvisorReviews: c.tripadvisor_review_count,
        notes: c.notes,
        draft: c.is_draft,
      })),
      officers: officers.map((o) => ({ id: o.user_id, name: o.full_name })),
      checks: { duplicates, known, prohibited },
    });
  }),
);

// Screening: pass and route to the officers of the town, return to the submitter, or reject.
router.post(
  '/destinations/:id/screen',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const body = validate(
      z.object({
        decision: z.enum(['route', 'returned', 'rejected'], { error: 'Choose a decision.' }),
        remarks: z.string().optional(),
      }),
      req.body,
    );
    const { remarks } = validate(
      z.object({ remarks: remarksField(body.decision === 'route' ? 0 : 5) }),
      body,
    );
    const status = await withTransaction(async (db) => {
      const { rows } = await db.query(
        `SELECT d.*, j.name AS jurisdiction FROM destinations d JOIN jurisdictions j USING (jurisdiction_id)
         WHERE d.destination_id = $1 FOR UPDATE OF d`,
        [id],
      );
      const d = rows[0];
      if (!d) throw notFound('Destination not found.');
      if (d.workflow_status !== 'pending_verification') {
        throw conflict('This nomination has already been screened.');
      }
      const next = body.decision === 'route' ? 'pending_endorsement' : body.decision;
      if (next === 'pending_endorsement') {
        const officers = await officersFor(d.jurisdiction_id, db);
        if (!officers.length) {
          throw conflict(
            `No Local Tourism Officer covers ${d.jurisdiction} yet. Assign one in Users.`,
          );
        }
        // Passing screening also approves the nomination photos.
        await db.query(
          `UPDATE destination_images SET moderation_status = 'approved'
           WHERE destination_id = $1 AND review_id IS NULL AND moderation_status = 'pending'`,
          [id],
        );
        for (const officer of officers) {
          await notify(db, {
            userId: officer.user_id,
            type: 'routed_nomination',
            message: `New nomination to review: ${d.name} (${d.jurisdiction}).`,
          });
        }
      } else if (d.submitted_by) {
        await notify(db, {
          userId: d.submitted_by,
          type: next,
          message:
            next === 'returned'
              ? `Your nomination "${d.name}" was returned for changes: ${remarks}`
              : `Your nomination "${d.name}" was not accepted: ${remarks}`,
        });
      }
      await db.query('UPDATE destinations SET workflow_status = $2 WHERE destination_id = $1', [
        id,
        next,
      ]);
      await db.query(
        `INSERT INTO admin_verification_logs (destination_id, administrator_id, verification_status, remarks)
         VALUES ($1, $2, $3, $4)`,
        [id, req.user.user_id, next === 'pending_endorsement' ? 'verified' : next, remarks || null],
      );
      return next;
    });
    res.json({ id, status });
  }),
);

// Takes an endorsed destination off the public site after a report (returned or rejected).
router.post(
  '/destinations/:id/pull',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const { status, remarks } = validate(
      z.object({ status: z.enum(['returned', 'rejected']), remarks: remarksField(5) }),
      req.body,
    );
    await withTransaction(async (db) => {
      const { rows } = await db.query(
        'SELECT name, workflow_status, submitted_by FROM destinations WHERE destination_id = $1 FOR UPDATE',
        [id],
      );
      const d = rows[0];
      if (!d) throw notFound('Destination not found.');
      if (d.workflow_status !== 'endorsed')
        throw conflict('Only endorsed destinations can be pulled.');
      await db.query('UPDATE destinations SET workflow_status = $2 WHERE destination_id = $1', [
        id,
        status,
      ]);
      await db.query(
        `INSERT INTO admin_verification_logs (destination_id, administrator_id, verification_status, remarks)
         VALUES ($1, $2, $3, $4)`,
        [id, req.user.user_id, status, remarks],
      );
      if (d.submitted_by) {
        await notify(db, {
          userId: d.submitted_by,
          type: status,
          message:
            status === 'returned'
              ? `"${d.name}" was taken off Sulyap for changes: ${remarks}`
              : `"${d.name}" was removed from Sulyap: ${remarks}`,
        });
      }
    });
    res.json({ id, status });
  }),
);

// ------------------------------------------------------------------ Reports
const REPORT_SELECT = `
  SELECT p.report_id, p.reason, p.report_status, p.created_at, p.resolved_at,
    p.review_id, p.image_id, u.full_name AS reported_by, a.full_name AS resolved_by,
    CASE WHEN p.review_id IS NOT NULL THEN 'review' WHEN p.image_id IS NOT NULL THEN 'image'
         ELSE 'destination' END AS target,
    d.destination_id, d.name AS destination, j.name AS jurisdiction, d.workflow_status,
    r.rating, r.review_text, r.moderation_status AS review_status, ru.full_name AS review_by,
    r.created_at AS review_at, i.image_url, i.moderation_status AS image_status, iu.full_name AS image_by
  FROM reports p
  JOIN users u ON u.user_id = p.reported_by
  LEFT JOIN users a ON a.user_id = p.resolved_by
  LEFT JOIN reviews r ON r.review_id = p.review_id
  LEFT JOIN users ru ON ru.user_id = r.user_id
  LEFT JOIN destination_images i ON i.image_id = p.image_id
  LEFT JOIN users iu ON iu.user_id = i.user_id
  JOIN destinations d ON d.destination_id = COALESCE(p.destination_id, r.destination_id, i.destination_id)
  JOIN jurisdictions j ON j.jurisdiction_id = d.jurisdiction_id`;

function reportOut(r) {
  return {
    id: r.report_id,
    reason: r.reason,
    status: r.report_status,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
    reportedBy: r.reported_by,
    resolvedBy: r.resolved_by,
    target: r.target,
    destination: {
      id: r.destination_id,
      name: r.destination,
      jurisdiction: r.jurisdiction,
      status: r.workflow_status,
    },
    review:
      r.target === 'review'
        ? {
            id: r.review_id,
            rating: r.rating,
            text: r.review_text,
            status: r.review_status,
            by: r.review_by,
            at: r.review_at,
          }
        : null,
    image:
      r.target === 'image'
        ? { id: r.image_id, url: r.image_url, status: r.image_status, by: r.image_by }
        : null,
  };
}

router.get(
  '/reports',
  asyncRoute(async (req, res) => {
    const { status } = validate(
      z.object({
        status: z
          .enum(['all', 'pending', 'under_review', 'resolved', 'dismissed'])
          .optional()
          .default('all'),
      }),
      req.query,
    );
    const { rows } = await query(
      `${REPORT_SELECT} WHERE ($1 = 'all' OR p.report_status = $1)
       ORDER BY (p.report_status IN ('pending', 'under_review')) DESC, p.created_at DESC LIMIT 300`,
      [status],
    );
    const counts = await query(
      'SELECT report_status AS status, count(*) AS n FROM reports GROUP BY 1',
    );
    res.json({ reports: rows.map(reportOut), counts: countBy(counts.rows) });
  }),
);

router.get(
  '/reports/:id',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const { rows } = await query(`${REPORT_SELECT} WHERE p.report_id = $1`, [id]);
    if (!rows[0]) throw notFound('Report not found.');
    res.json(reportOut(rows[0]));
  }),
);

async function setModeration(db, table, column, id, to, from) {
  await db.query(
    `UPDATE ${table} SET moderation_status = $2 WHERE ${column} = $1 AND moderation_status = ANY ($3::text[])`,
    [id, to, from],
  );
}

router.post(
  '/reports/:id/close',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const d = validate(
      z.object({
        status: z.enum(['under_review', 'resolved', 'dismissed']),
        removeContent: z.boolean().optional().default(false),
      }),
      req.body,
    );
    if (d.removeContent && d.status !== 'resolved')
      throw badRequest('Content can only be removed when resolving.');
    await withTransaction(async (db) => {
      const { rows } = await db.query(
        `SELECT p.*, r.user_id AS review_owner, i.user_id AS image_owner,
           COALESCE(rd.name, idd.name) AS place
         FROM reports p
         LEFT JOIN reviews r ON r.review_id = p.review_id
         LEFT JOIN destinations rd ON rd.destination_id = r.destination_id
         LEFT JOIN destination_images i ON i.image_id = p.image_id
         LEFT JOIN destinations idd ON idd.destination_id = i.destination_id
         WHERE p.report_id = $1 FOR UPDATE OF p`,
        [id],
      );
      const r = rows[0];
      if (!r) throw notFound('Report not found.');
      if (!['pending', 'under_review'].includes(r.report_status)) {
        throw conflict('This report is already closed.');
      }
      const item = r.review_id
        ? {
            table: 'reviews',
            column: 'review_id',
            id: r.review_id,
            owner: r.review_owner,
            label: 'review',
          }
        : r.image_id
          ? {
              table: 'destination_images',
              column: 'image_id',
              id: r.image_id,
              owner: r.image_owner,
              label: 'photo',
            }
          : null;
      if (d.removeContent) {
        if (!item)
          throw badRequest('To take a destination down, use "Pull from public" on its page.');
        await setModeration(db, item.table, item.column, item.id, 'removed', [
          'pending',
          'approved',
          'flagged',
        ]);
        if (r.review_id) {
          await setModeration(db, 'destination_images', 'review_id', r.review_id, 'removed', [
            'pending',
            'approved',
            'flagged',
          ]);
        }
        await notify(db, {
          userId: item.owner,
          type: 'removed',
          message: `Your ${item.label} of ${r.place} was removed after a report (${r.reason}).`,
        });
      } else if (item && d.status === 'under_review') {
        // Flagged while the report is looked at; flagged content is hidden from the public.
        await setModeration(db, item.table, item.column, item.id, 'flagged', ['approved']);
      } else if (item) {
        // Dismissed, or resolved without removing it: the content is public again.
        await setModeration(db, item.table, item.column, item.id, 'approved', ['flagged']);
      }
      const closed = d.status !== 'under_review';
      await db.query(
        `UPDATE reports SET report_status = $2, resolved_at = $3, resolved_by = $4 WHERE report_id = $1`,
        [id, d.status, closed ? new Date() : null, closed ? req.user.user_id : null],
      );
    });
    res.json({ id, status: d.status });
  }),
);

export default router;
