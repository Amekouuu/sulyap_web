// /api/destinations: public browsing. Only endorsed destinations, approved photos, and approved
// reviews are ever returned here; everything else stays hidden until it is checked.
import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, notFound } from '../errors.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { likePattern } from '../lib/sql.js';
import { validate } from '../lib/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const NEARBY_RADII = [5, 10, 20];

const router = Router();
const PAGE_SIZE = 12;
const SIMILAR_LIMIT = 3;

// Endorsed destinations with their latest endorsement date and their cover photo.
// The cover is the primary approved nomination photo, else the oldest approved one.
const ENDORSED = `
  SELECT d.destination_id, d.name, d.description, d.season_tag, d.entrance_fee, d.best_time_to_visit,
    d.latitude, d.longitude, d.jurisdiction_id, j.name AS jurisdiction,
    COALESCE(e.endorsed_at, d.updated_at) AS endorsed_at,
    ARRAY(SELECT c.category_name FROM destination_categories dc
          JOIN categories c ON c.category_id = dc.category_id
          WHERE dc.destination_id = d.destination_id ORDER BY c.category_id)::text[] AS categories,
    (SELECT i.image_url FROM destination_images i
     WHERE i.destination_id = d.destination_id AND i.review_id IS NULL AND i.moderation_status = 'approved'
     ORDER BY i.is_primary DESC, i.created_at LIMIT 1) AS photo
  FROM destinations d
  JOIN jurisdictions j ON j.jurisdiction_id = d.jurisdiction_id
  LEFT JOIN LATERAL (
    SELECT max(el.endorsed_at) AS endorsed_at FROM endorsement_logs el
    WHERE el.destination_id = d.destination_id AND el.endorsement_status = 'endorsed'
  ) e ON true
  WHERE d.workflow_status = 'endorsed'`;

const card = (r) => ({
  id: r.destination_id,
  name: r.name,
  description: r.description,
  jurisdiction: r.jurisdiction,
  categories: r.categories,
  season: r.season_tag,
  entranceFee: r.entrance_fee,
  bestTime: r.best_time_to_visit,
  latitude: Number(r.latitude),
  longitude: Number(r.longitude),
  endorsedAt: r.endorsed_at,
  photo: r.photo,
});

const listFilters = z.object({
  q: z.string().trim().max(100).optional(),
  categories: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').filter(Boolean).slice(0, 6) : [])),
  season: z.enum(['Rainy', 'Summer']).optional(),
  jurisdiction: z.string().trim().max(100).optional(),
  sort: z.enum(['recent', 'az']).optional().default('recent'),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(48).optional().default(PAGE_SIZE),
});

// GET /api/destinations?q=&categories=Leisure,Cultural&season=Rainy&jurisdiction=Porac&sort=recent|az&page=1
// A season filter shows only destinations tagged with that season; untagged ones appear under all seasons.
router.get(
  '/',
  asyncRoute(async (req, res) => {
    const f = validate(listFilters, req.query);
    const order =
      f.sort === 'az' ? 'lower(name), endorsed_at DESC' : 'endorsed_at DESC, lower(name)';
    const { rows } = await query(
      `SELECT *, count(*) OVER () AS total FROM (${ENDORSED}) x
       WHERE ($1::text IS NULL OR name ILIKE $1 OR jurisdiction ILIKE $1)
         AND (cardinality($2::text[]) = 0 OR categories && $2::text[])
         AND ($3::text IS NULL OR season_tag = $3)
         AND ($4::text IS NULL OR jurisdiction = $4)
       ORDER BY ${order}
       LIMIT $5 OFFSET $6`,
      [
        f.q ? likePattern(f.q) : null,
        f.categories,
        f.season || null,
        f.jurisdiction || null,
        f.pageSize,
        (f.page - 1) * f.pageSize,
      ],
    );
    res.json({
      destinations: rows.map(card),
      total: rows[0] ? Number(rows[0].total) : 0,
      page: f.page,
      pageSize: f.pageSize,
    });
  }),
);

// GET /api/destinations/overview: totals for the Home page and the options for the filters.
router.get(
  '/overview',
  asyncRoute(async (req, res) => {
    const { rows } = await query(
      `SELECT
         (SELECT count(*)::int FROM destinations WHERE workflow_status = 'endorsed') AS total,
         (SELECT COALESCE(json_object_agg(t.name, t.n), '{}') FROM (
            SELECT c.category_name AS name, count(x.destination_id)::int AS n
            FROM categories c
            LEFT JOIN destination_categories dc ON dc.category_id = c.category_id
            LEFT JOIN destinations x ON x.destination_id = dc.destination_id AND x.workflow_status = 'endorsed'
            GROUP BY c.category_name) t) AS categories,
         ARRAY(SELECT DISTINCT j.name FROM destinations x
               JOIN jurisdictions j ON j.jurisdiction_id = x.jurisdiction_id
               WHERE x.workflow_status = 'endorsed' ORDER BY j.name) AS jurisdictions`,
    );
    res.json(rows[0]);
  }),
);

// GET /api/destinations/map: every endorsed destination, for the map pins.
router.get(
  '/map',
  asyncRoute(async (req, res) => {
    const { rows } = await query(`${ENDORSED} ORDER BY endorsed_at DESC LIMIT 1000`);
    res.json({ destinations: rows.map(card) });
  }),
);

// GET /api/destinations/nearby?radius=5|10|20: endorsed destinations within the radius of the
// signed-in Registered User's home location, nearest first. Distances are straight-line.
router.get(
  '/nearby',
  requireAuth,
  requireRole('registered_user'),
  asyncRoute(async (req, res) => {
    const { radius } = validate(
      z.object({
        radius: z.coerce
          .number()
          .refine((n) => NEARBY_RADII.includes(n), 'Choose 5, 10, or 20 km.')
          .default(10),
      }),
      req.query,
    );
    const { address_latitude: lat, address_longitude: lng } = req.user;
    if (lat === null || lng === null) {
      throw new HttpError(409, 'no_home_location', 'Set your home location first.');
    }
    const { rows } = await query(
      `SELECT * FROM (
         SELECT x.*, 6371 * 2 * asin(sqrt(
           power(sin(radians(x.latitude - $1) / 2), 2) +
           cos(radians($1)) * cos(radians(x.latitude)) * power(sin(radians(x.longitude - $2) / 2), 2)
         )) AS distance_km
         FROM (${ENDORSED}) x) n
       WHERE distance_km <= $3
       ORDER BY distance_km, lower(name)`,
      [Number(lat), Number(lng), radius],
    );
    res.json({
      radius,
      home: { latitude: Number(lat), longitude: Number(lng), address: req.user.home_address },
      destinations: rows.map((r) => ({
        ...card(r),
        distanceKm: Math.round(Number(r.distance_km) * 10) / 10,
      })),
    });
  }),
);

// Similar destinations: the most shared categories first, then the newest endorsement.
// If fewer than three share a category, endorsed places in the same municipality fill the rest.
async function similarTo(destination) {
  const { rows } = await query(
    `SELECT x.*,
       cardinality(ARRAY(SELECT unnest(x.categories) INTERSECT SELECT unnest($2::text[]))) AS shared
     FROM (${ENDORSED}) x
     WHERE x.destination_id <> $1
       AND (x.categories && $2::text[] OR x.jurisdiction_id = $3)
     ORDER BY shared DESC, x.endorsed_at DESC
     LIMIT $4`,
    [
      destination.destination_id,
      destination.categories,
      destination.jurisdiction_id,
      SIMILAR_LIMIT,
    ],
  );
  return rows.map((r) => ({
    ...card(r),
    reason: Number(r.shared) > 0 ? 'category' : 'jurisdiction',
  }));
}

// GET /api/destinations/:id: everything shown on the destination page.
router.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const { id } = validate(z.object({ id: z.coerce.number().int().positive() }), req.params);
    const found = await query(
      `SELECT x.*, d.location, d.operating_hours, d.safety_reminders,
         (SELECT u.full_name FROM endorsement_logs el JOIN users u ON u.user_id = el.tourism_officer_id
          WHERE el.destination_id = x.destination_id AND el.endorsement_status = 'endorsed'
          ORDER BY el.endorsed_at DESC LIMIT 1) AS endorsed_by
       FROM (${ENDORSED}) x JOIN destinations d ON d.destination_id = x.destination_id
       WHERE x.destination_id = $1`,
      [id],
    );
    const d = found.rows[0];
    if (!d)
      throw notFound('This destination is not available. Only endorsed destinations are public.');

    const [photos, reviews, rating, similar] = await Promise.all([
      query(
        `SELECT i.image_id, i.image_url, i.caption, i.review_id, u.full_name
         FROM destination_images i JOIN users u ON u.user_id = i.user_id
         LEFT JOIN reviews r ON r.review_id = i.review_id
         WHERE i.destination_id = $1 AND i.moderation_status = 'approved'
           AND (i.review_id IS NULL OR r.moderation_status = 'approved')
         ORDER BY (i.review_id IS NULL) DESC, i.is_primary DESC, i.created_at`,
        [id],
      ),
      query(
        `SELECT r.review_id, r.rating, r.review_text, r.created_at, u.full_name
         FROM reviews r JOIN users u ON u.user_id = r.user_id
         WHERE r.destination_id = $1 AND r.moderation_status = 'approved'
         ORDER BY r.created_at DESC
         LIMIT 100`,
        [id],
      ),
      query(
        `SELECT count(*)::int AS count, round(avg(rating)::numeric, 1)::float AS average
         FROM reviews WHERE destination_id = $1 AND moderation_status = 'approved'`,
        [id],
      ),
      similarTo(d),
    ]);

    const photoList = photos.rows.map((p) => ({
      id: p.image_id,
      url: p.image_url,
      caption: p.caption,
      by: p.full_name,
      reviewId: p.review_id,
    }));
    res.json({
      ...card(d),
      location: d.location,
      operatingHours: d.operating_hours,
      safetyReminders: d.safety_reminders,
      endorsedBy: d.endorsed_by,
      photos: photoList,
      rating: rating.rows[0],
      reviews: reviews.rows.map((r) => ({
        id: r.review_id,
        rating: r.rating,
        text: r.review_text,
        createdAt: r.created_at,
        by: r.full_name,
        photos: photoList.filter((p) => p.reviewId === r.review_id),
      })),
      similar,
    });
  }),
);

export default router;
