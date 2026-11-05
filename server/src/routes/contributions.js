// Reviews and reports by Registered Users with a verified ID.
//   POST /api/destinations/:id/reviews   rating 1-5, optional text, up to 3 photos (multipart)
//   GET  /api/reviews/mine               the user's reviews and their moderation status
//   POST /api/reports                    report a review, a photo, or a destination
// New reviews and photos wait for an administrator (pre-moderation) before they are public.
import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { HttpError, badRequest, conflict, forbidden, notFound } from '../errors.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { findProhibitedTerms } from '../lib/screening.js';
import { deletePhoto, savePhoto } from '../lib/storage.js';
import { assertJpegOrPng, manyImages } from '../lib/upload.js';
import { validate } from '../lib/validate.js';
import { requireContributor } from '../middleware/auth.js';
import { contributionLimiter } from '../middleware/rateLimits.js';

const router = Router();
const MAX_REVIEW_PHOTOS = 3;
const REPORT_REASONS = [
  'Spam or advertising',
  'Self-promotion by the owner',
  'Wrong information',
  'Inappropriate content',
  'Not about a tourist spot in Pampanga',
];

function prohibited(found) {
  return new HttpError(
    400,
    'prohibited_terms',
    'Your post contains words that are not allowed. Please remove them and try again.',
    { terms: found },
  );
}

// POST /api/destinations/:id/reviews
router.post(
  '/destinations/:id/reviews',
  requireContributor,
  contributionLimiter,
  manyImages('photos', MAX_REVIEW_PHOTOS),
  asyncRoute(async (req, res) => {
    const { id } = validate(z.object({ id: z.coerce.number().int().positive() }), req.params);
    const d = validate(
      z.object({
        rating: z.coerce
          .number({ error: 'Choose a rating from 1 to 5 stars.' })
          .int()
          .min(1, 'Choose a rating from 1 to 5 stars.')
          .max(5, 'Choose a rating from 1 to 5 stars.'),
        text: z
          .string()
          .trim()
          .max(2000, 'Keep the review under 2000 characters.')
          .optional()
          .transform((v) => v || null),
      }),
      req.body,
    );
    const files = req.files || [];
    files.forEach(assertJpegOrPng);

    const destination = await query(
      `SELECT name FROM destinations WHERE destination_id = $1 AND workflow_status = 'endorsed'`,
      [id],
    );
    if (!destination.rows[0])
      throw notFound('Reviews can only be written for endorsed destinations.');
    const existing = await query(
      `SELECT 1 FROM reviews WHERE destination_id = $1 AND user_id = $2 AND moderation_status <> 'removed'`,
      [id, req.user.user_id],
    );
    if (existing.rowCount) throw conflict('You have already reviewed this destination.');
    const found = await findProhibitedTerms([d.text]);
    if (found.length) throw prohibited(found);

    // Photos are stored first; if saving the review fails, they are deleted again.
    const urls = [];
    try {
      for (const file of files) urls.push(await savePhoto(`reviews/${id}`, file));
      const reviewId = await withTransaction(async (db) => {
        // Checked again under a per-user lock, so two quick submits cannot create two reviews.
        await db.query('SELECT pg_advisory_xact_lock($1, $2)', [req.user.user_id, id]);
        const again = await db.query(
          `SELECT 1 FROM reviews WHERE destination_id = $1 AND user_id = $2 AND moderation_status <> 'removed'`,
          [id, req.user.user_id],
        );
        if (again.rowCount) throw conflict('You have already reviewed this destination.');
        const { rows } = await db.query(
          `INSERT INTO reviews (destination_id, user_id, rating, review_text)
           VALUES ($1, $2, $3, $4) RETURNING review_id`,
          [id, req.user.user_id, d.rating, d.text],
        );
        for (const url of urls) {
          await db.query(
            `INSERT INTO destination_images (destination_id, user_id, review_id, image_url)
             VALUES ($1, $2, $3, $4)`,
            [id, req.user.user_id, rows[0].review_id, url],
          );
        }
        return rows[0].review_id;
      });
      res.status(201).json({ id: reviewId, status: 'pending' });
    } catch (error) {
      await Promise.allSettled(urls.map(deletePhoto));
      throw error;
    }
  }),
);

// GET /api/reviews/mine
router.get(
  '/reviews/mine',
  requireContributor,
  asyncRoute(async (req, res) => {
    const { rows } = await query(
      `SELECT r.review_id, r.rating, r.review_text, r.moderation_status, r.created_at,
         d.destination_id, d.name AS destination, d.workflow_status,
         COALESCE((SELECT json_agg(json_build_object('id', i.image_id, 'url', i.image_url,
             'status', i.moderation_status) ORDER BY i.created_at)
           FROM destination_images i WHERE i.review_id = r.review_id), '[]') AS photos
       FROM reviews r JOIN destinations d ON d.destination_id = r.destination_id
       WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 200`,
      [req.user.user_id],
    );
    res.json({
      reviews: rows.map((r) => ({
        id: r.review_id,
        rating: r.rating,
        text: r.review_text,
        status: r.moderation_status,
        createdAt: r.created_at,
        destination: {
          id: r.destination_id,
          name: r.destination,
          public: r.workflow_status === 'endorsed',
        },
        photos: r.photos,
      })),
    });
  }),
);

// Finds what is being reported, and who posted it. Only public content can be reported.
async function reportTarget(target, id) {
  const sql = {
    destination: `SELECT submitted_by AS owner FROM destinations
                  WHERE destination_id = $1 AND workflow_status = 'endorsed'`,
    review: `SELECT user_id AS owner FROM reviews WHERE review_id = $1 AND moderation_status = 'approved'`,
    image: `SELECT user_id AS owner FROM destination_images
            WHERE image_id = $1 AND moderation_status = 'approved'`,
  }[target];
  const { rows } = await query(sql, [id]);
  return rows[0];
}

const COLUMN = { review: 'review_id', image: 'image_id', destination: 'destination_id' };

// POST /api/reports { target: 'review'|'image'|'destination', id, reason, details? }
router.post(
  '/reports',
  requireContributor,
  contributionLimiter,
  asyncRoute(async (req, res) => {
    const d = validate(
      z.object({
        target: z.enum(['review', 'image', 'destination']),
        id: z.coerce.number().int().positive(),
        reason: z.enum(REPORT_REASONS, { error: 'Choose a reason for the report.' }),
        details: z
          .string()
          .trim()
          .max(1000, 'Keep the details under 1000 characters.')
          .optional()
          .transform((v) => v || ''),
      }),
      req.body,
    );
    const found = await reportTarget(d.target, d.id);
    if (!found) throw notFound('That item is not available to report.');
    if (found.owner === req.user.user_id) throw forbidden('You cannot report your own post.');
    if (d.reason === 'Wrong information' && d.details.length < 5) {
      throw badRequest('Tell us what is wrong so the administrator can check it.');
    }
    const column = COLUMN[d.target];
    const open = await query(
      `SELECT 1 FROM reports WHERE reported_by = $1 AND ${column} = $2
         AND report_status IN ('pending', 'under_review')`,
      [req.user.user_id, d.id],
    );
    if (open.rowCount)
      throw conflict('You already reported this. An administrator will look at it.');
    const { rows } = await query(
      `INSERT INTO reports (reported_by, ${column}, reason) VALUES ($1, $2, $3) RETURNING report_id`,
      [req.user.user_id, d.id, d.details ? `${d.reason}: ${d.details}` : d.reason],
    );
    res.status(201).json({ id: rows[0].report_id, status: 'pending' });
  }),
);

export default router;
