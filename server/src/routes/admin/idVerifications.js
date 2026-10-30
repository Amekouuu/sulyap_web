// /api/admin/id-verifications: review uploaded IDs and verify or reject accounts.
import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../../db/pool.js';
import { conflict, notFound } from '../../errors.js';
import { asyncRoute } from '../../lib/asyncRoute.js';
import { verificationResultEmail } from '../../lib/emails.js';
import { sendMailSafely } from '../../lib/mailer.js';
import { ID_TYPES } from '../../lib/rules.js';
import { signedIdImageUrl } from '../../lib/storage.js';
import { validate } from '../../lib/validate.js';
import { notify } from '../../services/notifications.js';
import { latestVerificationNote } from '../../services/users.js';

const router = Router();
const userParam = z.object({ userId: z.coerce.number().int().positive() });

// GET /api/admin/id-verifications?status=pending|verified|rejected|all
router.get(
  '/',
  asyncRoute(async (req, res) => {
    const { status } = validate(
      z.object({
        status: z.enum(['all', 'pending', 'verified', 'rejected']).optional().default('all'),
      }),
      req.query,
    );
    const { rows } = await query(
      `SELECT user_id, full_name, email, id_type, account_verification_status, created_at, verified_at
       FROM users
       WHERE role = 'registered_user' AND account_verification_status IS NOT NULL
         AND ($1 = 'all' OR account_verification_status = $1)
       ORDER BY (account_verification_status = 'pending') DESC, created_at DESC
       LIMIT 200`,
      [status],
    );
    const counts = await query(
      `SELECT account_verification_status AS status, count(*)::int AS n FROM users
       WHERE role = 'registered_user' AND account_verification_status IS NOT NULL GROUP BY 1`,
    );
    res.json({
      records: rows.map((r) => ({
        userId: r.user_id,
        fullName: r.full_name,
        email: r.email,
        idType: r.id_type,
        status: r.account_verification_status,
        registeredAt: r.created_at,
        decidedAt: r.verified_at,
      })),
      counts: Object.fromEntries(counts.rows.map((r) => [r.status, r.n])),
    });
  }),
);

// GET /api/admin/id-verifications/:userId: details plus a link to the ID photo that expires in 5 minutes.
router.get(
  '/:userId',
  asyncRoute(async (req, res) => {
    const { userId } = validate(userParam, req.params);
    const { rows } = await query(
      `SELECT u.user_id, u.full_name, u.email, u.contact_number, u.home_address, u.created_at,
         u.email_verified_at, u.id_type, u.id_document_url, u.account_verification_status,
         u.verified_at, u.account_status, a.full_name AS verified_by_name
       FROM users u LEFT JOIN users a ON a.user_id = u.verified_by
       WHERE u.user_id = $1 AND u.role = 'registered_user'`,
      [userId],
    );
    const u = rows[0];
    if (!u || !u.account_verification_status)
      throw notFound('No ID has been submitted for this account.');
    let imageUrl = null;
    let imageError = null;
    if (u.id_document_url?.startsWith('/demo/')) {
      // Test data: a sample image served by the website, not stored in Supabase.
      imageUrl = u.id_document_url;
    } else if (u.id_document_url) {
      try {
        imageUrl = await signedIdImageUrl(u.id_document_url);
      } catch (error) {
        imageError = error.message;
      }
    }
    res.json({
      userId: u.user_id,
      fullName: u.full_name,
      email: u.email,
      contactNumber: u.contact_number,
      homeAddress: u.home_address,
      registeredAt: u.created_at,
      emailVerifiedAt: u.email_verified_at,
      accountStatus: u.account_status,
      idType: u.id_type,
      status: u.account_verification_status,
      decidedAt: u.verified_at,
      decidedBy: u.verified_by_name,
      note:
        u.account_verification_status === 'rejected'
          ? await latestVerificationNote(u.user_id)
          : null,
      imageUrl,
      imageError,
      imageDeleted: !u.id_document_url && u.account_verification_status !== 'pending',
    });
  }),
);

// POST /api/admin/id-verifications/:userId/decision  { decision, reason?, idType? }
router.post(
  '/:userId/decision',
  asyncRoute(async (req, res) => {
    const { userId } = validate(userParam, req.params);
    const data = validate(
      z
        .object({
          decision: z.enum(['verified', 'rejected'], { error: 'Choose verify or reject.' }),
          reason: z.string().trim().max(500, 'Keep the reason under 500 characters.').optional(),
          idType: z.enum(ID_TYPES).optional(),
        })
        .refine((d) => d.decision === 'verified' || (d.reason && d.reason.length >= 5), {
          message: 'Tell the user why the ID was rejected, so they can upload a better one.',
          path: ['reason'],
        }),
      req.body,
    );
    const approved = data.decision === 'verified';
    const message = approved
      ? 'Your ID has been verified. You can now post reviews, ratings, photos, reports, and nominations.'
      : `Your ID could not be verified: ${data.reason}`;

    const user = await withTransaction(async (db) => {
      const { rows } = await db.query(
        `SELECT user_id, full_name, email, account_verification_status FROM users
         WHERE user_id = $1 AND role = 'registered_user' FOR UPDATE`,
        [userId],
      );
      const target = rows[0];
      if (!target) throw notFound('User not found.');
      if (target.account_verification_status !== 'pending') {
        throw conflict('This ID has already been decided.');
      }
      await db.query(
        `UPDATE users SET account_verification_status = $2, verified_by = $3, verified_at = now(),
           id_type = COALESCE($4, id_type)
         WHERE user_id = $1`,
        [userId, data.decision, req.user.user_id, data.idType || null],
      );
      await notify(db, { userId, type: 'account_verification', message, email: false });
      return target;
    });

    await sendMailSafely({
      to: user.email,
      ...verificationResultEmail({ fullName: user.full_name, approved, reason: data.reason }),
    });
    res.json({ userId, status: data.decision });
  }),
);

export default router;
