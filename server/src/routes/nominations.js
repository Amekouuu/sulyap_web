// /api/nominations: a Registered User's own nominations (drafts, submissions, and returned ones).
// Flow: save a draft -> add 1 to 5 photos -> submit. The automatic checks run on submit:
// prohibited words block it; similar names and already-promoted places ask the user to confirm.
import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { HttpError, badRequest, conflict, forbidden, notFound } from '../errors.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { isInPampanga } from '../lib/pampanga.js';
import { findDuplicates, findKnownDestinations, findProhibitedTerms } from '../lib/screening.js';
import { deletePhoto, savePhoto } from '../lib/storage.js';
import { assertJpegOrPng, manyImages } from '../lib/upload.js';
import { validate } from '../lib/validate.js';
import { requireContributor } from '../middleware/auth.js';
import { contributionLimiter } from '../middleware/rateLimits.js';
import { notify } from '../services/notifications.js';

const router = Router();
router.use(requireContributor);

const MAX_PHOTOS = 5;
const EDITABLE = ['draft', 'returned'];
const idParam = z.object({ id: z.coerce.number().int().positive() });

const optionalText = (max, label) =>
  z
    .string()
    .trim()
    .max(max, `Keep the ${label} under ${max} characters.`)
    .optional()
    .nullable()
    .transform((v) => v || null);

// What a draft needs: a name, the city or municipality, and a pin inside Pampanga.
const draftSchema = z
  .object({
    name: z
      .string({ error: 'Enter the name of the destination.' })
      .trim()
      .min(2, 'Enter the name of the destination.')
      .max(150, 'Keep the name under 150 characters.'),
    jurisdictionId: z.coerce
      .number({ error: 'Choose the city or municipality.' })
      .int()
      .positive('Choose the city or municipality.'),
    latitude: z.coerce.number({ error: 'Place a pin on the map.' }).min(-90).max(90),
    longitude: z.coerce.number({ error: 'Place a pin on the map.' }).min(-180).max(180),
    location: z.string().trim().max(255, 'Keep the address under 255 characters.').default(''),
    description: z
      .string()
      .trim()
      .max(5000, 'Keep the description under 5000 characters.')
      .default(''),
    categories: z.array(z.string()).max(6).default([]),
    entranceFee: optionalText(100, 'entrance fee'),
    bestTimeToVisit: optionalText(255, 'best time to visit'),
    operatingHours: optionalText(255, 'operating hours'),
    safetyReminders: optionalText(2000, 'safety reminders'),
  })
  .refine((d) => isInPampanga(d.latitude, d.longitude), {
    message: 'The pin must be inside Pampanga.',
    path: ['latitude'],
  });

// Extra rules checked when the nomination is submitted.
function assertComplete(d, photoCount) {
  const problems = [];
  if (d.location.length < 5)
    problems.push({ field: 'location', message: 'Enter the address or landmark directions.' });
  if (d.description.length < 30)
    problems.push({
      field: 'description',
      message: 'Describe the place in at least 30 characters.',
    });
  if (!d.categories.length)
    problems.push({ field: 'categories', message: 'Choose at least one category.' });
  if (!d.operatingHours)
    problems.push({
      field: 'operatingHours',
      message: 'Enter the operating hours (or "Open daily").',
    });
  if (photoCount < 1) problems.push({ field: 'photos', message: 'Add at least one photo.' });
  if (problems.length) throw badRequest(problems[0].message, problems);
}

async function categoryIds(names, db) {
  if (!names.length) return [];
  const { rows } = await db.query(
    'SELECT category_id, category_name FROM categories WHERE category_name = ANY ($1::text[])',
    [names],
  );
  if (rows.length !== new Set(names).size) throw badRequest('One of the categories is not valid.');
  return rows.map((r) => r.category_id);
}

async function assertJurisdiction(id, db) {
  const { rowCount } = await db.query('SELECT 1 FROM jurisdictions WHERE jurisdiction_id = $1', [
    id,
  ]);
  if (!rowCount) throw badRequest('Choose a city or municipality in Pampanga.');
}

// Loads one of the signed-in user's nominations. lock = FOR UPDATE inside a transaction.
async function loadOwn(db, id, userId, lock = false) {
  const { rows } = await db.query(
    `SELECT * FROM destinations WHERE destination_id = $1 ${lock ? 'FOR UPDATE' : ''}`,
    [id],
  );
  const d = rows[0];
  if (!d || d.submitted_by !== userId) throw notFound('Nomination not found.');
  return d;
}

function assertEditable(d) {
  if (!EDITABLE.includes(d.workflow_status)) {
    throw forbidden('This nomination is being reviewed and can no longer be changed.');
  }
}

// The latest return or rejection remark, from the administrator or the Local Tourism Officer.
const LATEST_DECISION = `
  SELECT * FROM (
    SELECT 'administrator' AS by_role, verification_status AS status, remarks, verified_at AS at
    FROM admin_verification_logs WHERE destination_id = $1
    UNION ALL
    SELECT 'tourism_officer', endorsement_status, remarks, endorsed_at
    FROM endorsement_logs WHERE destination_id = $1
  ) x ORDER BY at DESC LIMIT 1`;

async function nominationOut(d, db = { query }) {
  const [categories, photos, decision, town] = await Promise.all([
    db.query(
      `SELECT c.category_name FROM destination_categories dc JOIN categories c USING (category_id)
       WHERE dc.destination_id = $1 ORDER BY c.category_id`,
      [d.destination_id],
    ),
    db.query(
      `SELECT image_id, image_url, is_primary, moderation_status FROM destination_images
       WHERE destination_id = $1 AND review_id IS NULL ORDER BY is_primary DESC, created_at`,
      [d.destination_id],
    ),
    db.query(LATEST_DECISION, [d.destination_id]),
    db.query('SELECT name FROM jurisdictions WHERE jurisdiction_id = $1', [d.jurisdiction_id]),
  ]);
  const last = decision.rows[0];
  return {
    id: d.destination_id,
    status: d.workflow_status,
    name: d.name,
    jurisdictionId: d.jurisdiction_id,
    jurisdiction: town.rows[0]?.name,
    latitude: Number(d.latitude),
    longitude: Number(d.longitude),
    location: d.location,
    description: d.description,
    categories: categories.rows.map((r) => r.category_name),
    entranceFee: d.entrance_fee,
    bestTimeToVisit: d.best_time_to_visit,
    operatingHours: d.operating_hours,
    safetyReminders: d.safety_reminders,
    seasonTag: d.season_tag,
    photos: photos.rows.map((p) => ({
      id: p.image_id,
      url: p.image_url,
      isPrimary: p.is_primary,
      status: p.moderation_status,
    })),
    lastDecision: last
      ? { by: last.by_role, status: last.status, remarks: last.remarks, at: last.at }
      : null,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

async function saveFields(db, id, d) {
  await db.query(
    `UPDATE destinations SET name = $2, jurisdiction_id = $3, latitude = $4, longitude = $5,
       location = $6, description = $7, entrance_fee = $8, best_time_to_visit = $9,
       operating_hours = $10, safety_reminders = $11
     WHERE destination_id = $1`,
    [
      id,
      d.name,
      d.jurisdictionId,
      d.latitude,
      d.longitude,
      d.location,
      d.description,
      d.entranceFee,
      d.bestTimeToVisit,
      d.operatingHours,
      d.safetyReminders,
    ],
  );
  const ids = await categoryIds(d.categories, db);
  await db.query('DELETE FROM destination_categories WHERE destination_id = $1', [id]);
  for (const categoryId of ids) {
    await db.query(
      'INSERT INTO destination_categories (destination_id, category_id) VALUES ($1, $2)',
      [id, categoryId],
    );
  }
}

// GET /api/nominations: the user's nominations, newest change first.
router.get(
  '/',
  asyncRoute(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM destinations WHERE submitted_by = $1 ORDER BY updated_at DESC LIMIT 200`,
      [req.user.user_id],
    );
    res.json({ nominations: await Promise.all(rows.map((d) => nominationOut(d))) });
  }),
);

// POST /api/nominations/check { name, jurisdictionId, excludeId? }: warnings while typing.
router.post(
  '/check',
  asyncRoute(async (req, res) => {
    const d = validate(
      z.object({
        name: z.string().trim().min(2).max(150),
        jurisdictionId: z.coerce.number().int().positive(),
        excludeId: z.coerce.number().int().positive().optional(),
      }),
      req.body,
    );
    const [duplicates, known] = await Promise.all([findDuplicates(d), findKnownDestinations(d)]);
    res.json({ duplicates, known });
  }),
);

// POST /api/nominations: creates a draft.
router.post(
  '/',
  contributionLimiter,
  asyncRoute(async (req, res) => {
    const d = validate(draftSchema, req.body);
    const created = await withTransaction(async (db) => {
      await assertJurisdiction(d.jurisdictionId, db);
      const { rows } = await db.query(
        `INSERT INTO destinations (jurisdiction_id, submitted_by, name, description, location, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING destination_id`,
        [
          d.jurisdictionId,
          req.user.user_id,
          d.name,
          d.description,
          d.location,
          d.latitude,
          d.longitude,
        ],
      );
      const id = rows[0].destination_id;
      await saveFields(db, id, d);
      return loadOwn(db, id, req.user.user_id);
    });
    res.status(201).json(await nominationOut(created));
  }),
);

// GET /api/nominations/:id
router.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    res.json(await nominationOut(await loadOwn({ query }, id, req.user.user_id)));
  }),
);

// PUT /api/nominations/:id: saves changes to a draft or a returned nomination.
router.put(
  '/:id',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const d = validate(draftSchema, req.body);
    const saved = await withTransaction(async (db) => {
      assertEditable(await loadOwn(db, id, req.user.user_id, true));
      await assertJurisdiction(d.jurisdictionId, db);
      await saveFields(db, id, d);
      return loadOwn(db, id, req.user.user_id);
    });
    res.json(await nominationOut(saved));
  }),
);

// DELETE /api/nominations/:id: deletes a draft that was never submitted.
router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const urls = await withTransaction(async (db) => {
      const d = await loadOwn(db, id, req.user.user_id, true);
      if (d.workflow_status !== 'draft') throw forbidden('Only drafts can be deleted.');
      const photos = await db.query(
        'SELECT image_url FROM destination_images WHERE destination_id = $1',
        [id],
      );
      await db.query('DELETE FROM destinations WHERE destination_id = $1', [id]);
      return photos.rows.map((p) => p.image_url);
    });
    await Promise.allSettled(urls.map(deletePhoto));
    res.status(204).end();
  }),
);

// POST /api/nominations/:id/photos (multipart "photos", JPG/PNG up to 5 MB each, 5 in total)
router.post(
  '/:id/photos',
  contributionLimiter,
  manyImages('photos', MAX_PHOTOS),
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const files = req.files || [];
    if (!files.length) throw badRequest('Choose at least one photo.');
    files.forEach(assertJpegOrPng);
    // The nomination row stays locked while the photos are saved, so two uploads at once cannot
    // go past the limit. Stored files are deleted again if saving fails.
    const urls = [];
    try {
      await withTransaction(async (db) => {
        assertEditable(await loadOwn(db, id, req.user.user_id, true));
        const { rows } = await db.query(
          `SELECT count(*)::int AS n, COALESCE(bool_or(is_primary), false) AS has_primary
           FROM destination_images WHERE destination_id = $1 AND review_id IS NULL`,
          [id],
        );
        if (rows[0].n + files.length > MAX_PHOTOS) {
          throw badRequest(`A nomination can have up to ${MAX_PHOTOS} photos.`);
        }
        let needsPrimary = !rows[0].has_primary;
        for (const file of files) {
          const url = await savePhoto(`nominations/${id}`, file);
          urls.push(url);
          await db.query(
            `INSERT INTO destination_images (destination_id, user_id, is_primary, image_url, moderation_status)
             VALUES ($1, $2, $3, $4, 'pending')`,
            [id, req.user.user_id, needsPrimary, url],
          );
          needsPrimary = false;
        }
      });
    } catch (error) {
      await Promise.allSettled(urls.map(deletePhoto));
      throw error;
    }
    res.status(201).json(await nominationOut(await loadOwn({ query }, id, req.user.user_id)));
  }),
);

const photoParams = z.object({
  id: z.coerce.number().int().positive(),
  imageId: z.coerce.number().int().positive(),
});

// DELETE /api/nominations/:id/photos/:imageId
router.delete(
  '/:id/photos/:imageId',
  asyncRoute(async (req, res) => {
    const { id, imageId } = validate(photoParams, req.params);
    const url = await withTransaction(async (db) => {
      assertEditable(await loadOwn(db, id, req.user.user_id, true));
      const { rows } = await db.query(
        `DELETE FROM destination_images WHERE image_id = $1 AND destination_id = $2 AND review_id IS NULL
         RETURNING image_url, is_primary`,
        [imageId, id],
      );
      if (!rows[0]) throw notFound('Photo not found.');
      if (rows[0].is_primary) {
        // Another photo becomes the main one.
        await db.query(
          `UPDATE destination_images SET is_primary = true WHERE image_id = (
             SELECT image_id FROM destination_images WHERE destination_id = $1 AND review_id IS NULL
             ORDER BY created_at LIMIT 1)`,
          [id],
        );
      }
      return rows[0].image_url;
    });
    await deletePhoto(url).catch(() => {});
    res.json(await nominationOut(await loadOwn({ query }, id, req.user.user_id)));
  }),
);

// POST /api/nominations/:id/photos/:imageId/primary: makes this the main photo.
router.post(
  '/:id/photos/:imageId/primary',
  asyncRoute(async (req, res) => {
    const { id, imageId } = validate(photoParams, req.params);
    await withTransaction(async (db) => {
      assertEditable(await loadOwn(db, id, req.user.user_id, true));
      const found = await db.query(
        'SELECT 1 FROM destination_images WHERE image_id = $1 AND destination_id = $2 AND review_id IS NULL',
        [imageId, id],
      );
      if (!found.rowCount) throw notFound('Photo not found.');
      await db.query('UPDATE destination_images SET is_primary = false WHERE destination_id = $1', [
        id,
      ]);
      await db.query('UPDATE destination_images SET is_primary = true WHERE image_id = $1', [
        imageId,
      ]);
    });
    res.json(await nominationOut(await loadOwn({ query }, id, req.user.user_id)));
  }),
);

// POST /api/nominations/:id/submit { confirmWarnings?: true }
router.post(
  '/:id/submit',
  contributionLimiter,
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const { confirmWarnings } = validate(
      z.object({ confirmWarnings: z.boolean().optional().default(false) }),
      req.body,
    );
    const current = await nominationOut(await loadOwn({ query }, id, req.user.user_id));
    if (!EDITABLE.includes(current.status))
      throw conflict('This nomination was already submitted.');
    const d = validate(draftSchema, current);
    assertComplete(d, current.photos.length);

    const found = await findProhibitedTerms([
      d.name,
      d.location,
      d.description,
      d.entranceFee,
      d.bestTimeToVisit,
      d.operatingHours,
      d.safetyReminders,
    ]);
    if (found.length) {
      throw new HttpError(
        400,
        'prohibited_terms',
        'Your nomination contains words that are not allowed. Please remove them and try again.',
        { terms: found },
      );
    }

    const [duplicates, known] = await Promise.all([
      findDuplicates({ name: d.name, jurisdictionId: d.jurisdictionId, excludeId: id }),
      findKnownDestinations({ name: d.name, jurisdictionId: d.jurisdictionId }),
    ]);
    if ((duplicates.length || known.length) && !confirmWarnings) {
      throw new HttpError(
        409,
        'needs_confirmation',
        'This place may already be on Sulyap or already promoted. Check the list before submitting.',
        { duplicates, known },
      );
    }

    const resubmitted = current.status === 'returned';
    await withTransaction(async (db) => {
      assertEditable(await loadOwn(db, id, req.user.user_id, true));
      await db.query(
        `UPDATE destinations SET workflow_status = 'pending_verification' WHERE destination_id = $1`,
        [id],
      );
      const admins = await db.query(
        `SELECT user_id FROM users WHERE role = 'administrator' AND account_status = 'active'`,
      );
      for (const admin of admins.rows) {
        await notify(db, {
          userId: admin.user_id,
          type: 'new_nomination',
          message: `${resubmitted ? 'Resubmitted' : 'New'} nomination to screen: ${d.name} (${current.jurisdiction}).`,
        });
      }
    });
    res.json(await nominationOut(await loadOwn({ query }, id, req.user.user_id)));
  }),
);

export default router;
