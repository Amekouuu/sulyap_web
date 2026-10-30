// /api/account: the signed-in user's own settings, ID upload, and password.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { HttpError, conflict, forbidden } from '../errors.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { ID_TYPES, passwordField } from '../lib/rules.js';
import { deleteIdImage, saveIdImage } from '../lib/storage.js';
import { assertJpegOrPng, singleImage } from '../lib/upload.js';
import { validate } from '../lib/validate.js';
import { requireAuth, requireRole, setSessionCookie } from '../middleware/auth.js';
import { geocodeLimiter, passwordLimiter } from '../middleware/rateLimits.js';
import { geocode } from '../lib/geocode.js';
import { BCRYPT_COST } from './auth.js';
import { USER_COLUMNS, toClientUser } from '../services/users.js';

const router = Router();
router.use(requireAuth);

// POST /api/account/id  (multipart: idType, photo). Front photo of one valid government ID.
router.post(
  '/id',
  requireRole('registered_user'),
  singleImage('photo'),
  asyncRoute(async (req, res) => {
    const user = req.user;
    if (!user.email_verified) throw forbidden('Verify your e-mail address before uploading an ID.');
    if (user.account_verification_status === 'verified')
      throw conflict('Your ID is already verified.');
    const { idType } = validate(
      z.object({ idType: z.enum(ID_TYPES, { error: 'Choose the type of ID you are uploading.' }) }),
      req.body,
    );
    assertJpegOrPng(req.file);

    const path = await saveIdImage(user.user_id, req.file);
    const { rows } = await query(
      `UPDATE users SET id_type = $2, id_document_url = $3, account_verification_status = 'pending',
         verified_by = NULL, verified_at = NULL
       WHERE user_id = $1
       RETURNING ${USER_COLUMNS}`,
      [user.user_id, idType, path],
    );
    // A replaced photo (re-upload) is removed right away.
    if (user.id_document_url && user.id_document_url !== path) {
      deleteIdImage(user.id_document_url).catch((error) => console.error(error.message));
    }
    res.json({ user: await toClientUser(rows[0]) });
  }),
);

// PATCH /api/account/settings  { newsletterOptIn }
router.patch(
  '/settings',
  asyncRoute(async (req, res) => {
    const data = validate(z.object({ newsletterOptIn: z.boolean() }), req.body);
    const { rows } = await query(
      `UPDATE users SET newsletter_opt_in = $2 WHERE user_id = $1 RETURNING ${USER_COLUMNS}`,
      [req.user.user_id, data.newsletterOptIn],
    );
    res.json({ user: await toClientUser(rows[0]) });
  }),
);

// POST /api/account/home/lookup  { address } -> { results: [{ label, latitude, longitude }] }
// Finds an address so the user can confirm it on the map before saving.
router.post(
  '/home/lookup',
  requireRole('registered_user'),
  geocodeLimiter,
  asyncRoute(async (req, res) => {
    const { address } = validate(
      z.object({ address: z.string().trim().min(3, 'Type your address.').max(255) }),
      req.body,
    );
    try {
      res.json({ results: await geocode(address) });
    } catch (error) {
      console.error('Geocoding failed:', error.message);
      throw new HttpError(
        502,
        'geocoder_unavailable',
        'The address search is not available right now. Drop a pin on the map instead.',
      );
    }
  }),
);

// Roughly the Philippines, so a typo in coordinates cannot place someone abroad.
const PH = { latMin: 4, latMax: 22, lngMin: 116, lngMax: 127 };

// PUT /api/account/home  { address?, latitude, longitude }: the home location used by Nearby.
// DELETE /api/account/home clears it.
router.put(
  '/home',
  requireRole('registered_user'),
  asyncRoute(async (req, res) => {
    const data = validate(
      z.object({
        address: z.string().trim().max(255).nullish(),
        latitude: z.number().min(PH.latMin).max(PH.latMax),
        longitude: z.number().min(PH.lngMin).max(PH.lngMax),
      }),
      req.body,
    );
    const { rows } = await query(
      `UPDATE users SET home_address = $2, address_latitude = $3, address_longitude = $4
       WHERE user_id = $1 RETURNING ${USER_COLUMNS}`,
      [req.user.user_id, data.address || null, data.latitude, data.longitude],
    );
    res.json({ user: await toClientUser(rows[0]) });
  }),
);
router.delete(
  '/home',
  requireRole('registered_user'),
  asyncRoute(async (req, res) => {
    const { rows } = await query(
      `UPDATE users SET home_address = NULL, address_latitude = NULL, address_longitude = NULL
       WHERE user_id = $1 RETURNING ${USER_COLUMNS}`,
      [req.user.user_id],
    );
    res.json({ user: await toClientUser(rows[0]) });
  }),
);

// POST /api/account/password  { currentPassword, newPassword }
router.post(
  '/password',
  passwordLimiter,
  asyncRoute(async (req, res) => {
    const data = validate(
      z.object({
        currentPassword: z
          .string({ error: 'Enter your current password.' })
          .min(1, 'Enter your current password.'),
        newPassword: passwordField,
      }),
      req.body,
    );
    if (data.currentPassword === data.newPassword) {
      throw new HttpError(
        400,
        'same_password',
        'Choose a password different from your current one.',
      );
    }
    await withTransaction(async (db) => {
      const { rows } = await db.query(
        'SELECT password_hash FROM users WHERE user_id = $1 FOR UPDATE',
        [req.user.user_id],
      );
      if (!(await bcrypt.compare(data.currentPassword, rows[0].password_hash))) {
        throw new HttpError(400, 'wrong_password', 'Your current password is incorrect.');
      }
      const hash = await bcrypt.hash(data.newPassword, BCRYPT_COST);
      await db.query('UPDATE users SET password_hash = $2 WHERE user_id = $1', [
        req.user.user_id,
        hash,
      ]);
    });
    setSessionCookie(res, req.user);
    res.status(204).end();
  }),
);

export default router;
