// Administrator: community content (reviews and review photos) and the screening lists.
//   GET   /api/admin/community?status=&type=         reviews and photos, pending first
//   PATCH /api/admin/community/:type/:id             { status: approved | removed }
//   GET/POST/DELETE /api/admin/screening/prohibited-terms[/:id]
//   GET/POST/DELETE /api/admin/screening/known-destinations[/:id]
import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../../db/pool.js';
import { conflict, notFound } from '../../errors.js';
import { asyncRoute } from '../../lib/asyncRoute.js';
import { forgetProhibitedTerms } from '../../lib/screening.js';
import { likePattern } from '../../lib/sql.js';
import { validate } from '../../lib/validate.js';
import { notify } from '../../services/notifications.js';

const router = Router();
const MODERATION = ['pending', 'approved', 'flagged', 'removed'];
const idParam = z.object({ id: z.coerce.number().int().positive() });

// ------------------------------------------------------------------ Community content
router.get(
  '/community',
  asyncRoute(async (req, res) => {
    const f = validate(
      z.object({
        status: z
          .enum(['all', ...MODERATION])
          .optional()
          .default('all'),
        type: z.enum(['all', 'review', 'photo']).optional().default('all'),
      }),
      req.query,
    );
    const { rows } = await query(
      `SELECT * FROM (
         SELECT 'review' AS type, r.review_id AS id, r.rating, r.review_text AS text, NULL AS url,
           r.moderation_status AS status, r.created_at, u.full_name AS by,
           d.destination_id, d.name AS destination,
           (SELECT count(*)::int FROM destination_images i WHERE i.review_id = r.review_id) AS photo_count,
           (SELECT min(report_id) FROM reports p WHERE p.review_id = r.review_id
              AND p.report_status IN ('pending', 'under_review')) AS open_report
         FROM reviews r JOIN users u ON u.user_id = r.user_id JOIN destinations d USING (destination_id)
         UNION ALL
         SELECT 'photo', i.image_id, NULL, i.caption, i.image_url, i.moderation_status, i.created_at,
           u.full_name, d.destination_id, d.name, NULL,
           (SELECT min(report_id) FROM reports p WHERE p.image_id = i.image_id
              AND p.report_status IN ('pending', 'under_review'))
         FROM destination_images i JOIN users u ON u.user_id = i.user_id JOIN destinations d USING (destination_id)
         WHERE i.review_id IS NOT NULL
       ) x
       WHERE ($1 = 'all' OR status = $1) AND ($2 = 'all' OR type = $2)
       ORDER BY (status IN ('pending', 'flagged')) DESC, created_at DESC LIMIT 300`,
      [f.status, f.type],
    );
    const counts = await query(
      `SELECT status, count(*)::int AS n FROM (
         SELECT moderation_status AS status FROM reviews
         UNION ALL SELECT moderation_status FROM destination_images WHERE review_id IS NOT NULL
       ) x GROUP BY 1`,
    );
    res.json({
      items: rows.map((r) => ({
        type: r.type,
        id: r.id,
        rating: r.rating,
        text: r.text,
        url: r.url,
        status: r.status,
        createdAt: r.created_at,
        by: r.by,
        destination: { id: r.destination_id, name: r.destination },
        photoCount: r.photo_count,
        openReport: r.open_report,
      })),
      counts: Object.fromEntries(counts.rows.map((r) => [r.status, r.n])),
    });
  }),
);

router.patch(
  '/community/:type/:id',
  asyncRoute(async (req, res) => {
    const { type, id } = validate(
      z.object({ type: z.enum(['review', 'photo']), id: z.coerce.number().int().positive() }),
      req.params,
    );
    const { status } = validate(z.object({ status: z.enum(['approved', 'removed']) }), req.body);
    const table = type === 'review' ? 'reviews' : 'destination_images';
    const column = type === 'review' ? 'review_id' : 'image_id';
    await withTransaction(async (db) => {
      const { rows } = await db.query(
        `SELECT t.user_id, t.moderation_status, d.name FROM ${table} t
         JOIN destinations d ON d.destination_id = t.destination_id
         WHERE t.${column} = $1 ${type === 'photo' ? 'AND t.review_id IS NOT NULL' : ''} FOR UPDATE OF t`,
        [id],
      );
      const item = rows[0];
      if (!item) throw notFound('That review or photo was not found.');
      if (item.moderation_status === 'removed')
        throw conflict('Removed content cannot be restored.');
      await db.query(`UPDATE ${table} SET moderation_status = $2 WHERE ${column} = $1`, [
        id,
        status,
      ]);
      if (status === 'removed') {
        // A removed review takes its photos with it.
        if (type === 'review') {
          await db.query(
            `UPDATE destination_images SET moderation_status = 'removed' WHERE review_id = $1`,
            [id],
          );
        }
        // Open reports about it are resolved.
        await db.query(
          `UPDATE reports SET report_status = 'resolved', resolved_at = now(), resolved_by = $2
           WHERE ${column} = $1 AND report_status IN ('pending', 'under_review')`,
          [id, req.user.user_id],
        );
        await notify(db, {
          userId: item.user_id,
          type: 'removed',
          message: `Your ${type} of ${item.name} was removed by an administrator.`,
        });
      }
    });
    res.json({ type, id, status });
  }),
);

// ------------------------------------------------------------------ Screening lists
router.get(
  '/screening/prohibited-terms',
  asyncRoute(async (req, res) => {
    const f = validate(
      z.object({
        q: z.string().trim().max(100).optional(),
        language: z.enum(['all', 'english', 'filipino', 'kapampangan']).optional().default('all'),
      }),
      req.query,
    );
    const { rows } = await query(
      `SELECT t.term_id, t.term, t.language, t.created_at, u.full_name AS added_by
       FROM prohibited_terms t JOIN users u ON u.user_id = t.added_by
       WHERE ($1 = 'all' OR t.language = $1) AND ($2::text IS NULL OR t.term ILIKE $2)
       ORDER BY lower(t.term) LIMIT 1000`,
      [f.language, f.q ? likePattern(f.q) : null],
    );
    const counts = await query(
      'SELECT language, count(*)::int AS n FROM prohibited_terms GROUP BY 1',
    );
    res.json({
      terms: rows.map((t) => ({
        id: t.term_id,
        term: t.term,
        language: t.language,
        addedBy: t.added_by,
        addedAt: t.created_at,
      })),
      counts: Object.fromEntries(counts.rows.map((r) => [r.language, r.n])),
    });
  }),
);

router.post(
  '/screening/prohibited-terms',
  asyncRoute(async (req, res) => {
    const d = validate(
      z.object({
        term: z.string().trim().min(2, 'Enter a word or phrase.').max(255),
        language: z.enum(['english', 'filipino', 'kapampangan'], {
          error: 'Choose the language.',
        }),
      }),
      req.body,
    );
    const { rows } = await query(
      `INSERT INTO prohibited_terms (term, language, added_by) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING RETURNING term_id`,
      [d.term, d.language, req.user.user_id],
    );
    if (!rows[0]) throw conflict('That word is already on the list.');
    forgetProhibitedTerms();
    res.status(201).json({ id: rows[0].term_id, ...d });
  }),
);

router.delete(
  '/screening/prohibited-terms/:id',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const { rowCount } = await query('DELETE FROM prohibited_terms WHERE term_id = $1', [id]);
    if (!rowCount) throw notFound('Word not found.');
    forgetProhibitedTerms();
    res.status(204).end();
  }),
);

router.get(
  '/screening/known-destinations',
  asyncRoute(async (req, res) => {
    const f = validate(
      z.object({
        q: z.string().trim().max(100).optional(),
        jurisdictionId: z.coerce.number().int().positive().optional(),
      }),
      req.query,
    );
    const { rows } = await query(
      `SELECT k.known_destination_id, k.name, k.source, k.created_at, j.name AS jurisdiction,
         k.jurisdiction_id, u.full_name AS added_by
       FROM known_destinations k JOIN jurisdictions j USING (jurisdiction_id)
       JOIN users u ON u.user_id = k.added_by
       WHERE ($1::int IS NULL OR k.jurisdiction_id = $1) AND ($2::text IS NULL OR k.name ILIKE $2)
       ORDER BY j.name, lower(k.name) LIMIT 1000`,
      [f.jurisdictionId || null, f.q ? likePattern(f.q) : null],
    );
    res.json({
      places: rows.map((k) => ({
        id: k.known_destination_id,
        name: k.name,
        source: k.source,
        jurisdiction: k.jurisdiction,
        jurisdictionId: k.jurisdiction_id,
        addedBy: k.added_by,
        addedAt: k.created_at,
      })),
    });
  }),
);

router.post(
  '/screening/known-destinations',
  asyncRoute(async (req, res) => {
    const d = validate(
      z.object({
        name: z.string().trim().min(2, 'Enter the name of the place.').max(150),
        jurisdictionId: z.coerce
          .number({ error: 'Choose the city or municipality.' })
          .int()
          .positive(),
        source: z
          .string()
          .trim()
          .min(3, 'Say where it is promoted (a website, guidebook, or office).')
          .max(255),
      }),
      req.body,
    );
    const town = await query('SELECT 1 FROM jurisdictions WHERE jurisdiction_id = $1', [
      d.jurisdictionId,
    ]);
    if (!town.rowCount) throw notFound('City or municipality not found.');
    const { rows } = await query(
      `INSERT INTO known_destinations (name, jurisdiction_id, source, added_by)
       VALUES ($1, $2, $3, $4) RETURNING known_destination_id`,
      [d.name, d.jurisdictionId, d.source, req.user.user_id],
    );
    res.status(201).json({ id: rows[0].known_destination_id, ...d });
  }),
);

router.delete(
  '/screening/known-destinations/:id',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const { rowCount } = await query(
      'DELETE FROM known_destinations WHERE known_destination_id = $1',
      [id],
    );
    if (!rowCount) throw notFound('Place not found.');
    res.status(204).end();
  }),
);

export default router;
