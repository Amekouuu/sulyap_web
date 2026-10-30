// Development-only helpers. Never mounted when NODE_ENV=production.
import { Router } from 'express';
import { z } from 'zod';
import { devLoginEnabled } from '../config.js';
import { forbidden, notFound } from '../errors.js';
import { query } from '../db/pool.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { devOutbox } from '../lib/mailer.js';
import { runNewsletter } from '../jobs/newsletter.js';
import { validate } from '../lib/validate.js';
import { setSessionCookie } from '../middleware/auth.js';
import { findUserById, toClientUser, verificationState } from '../services/users.js';

const router = Router();

// GET /api/dev/outbox: e-mails "sent" while SMTP is not configured.
router.get('/outbox', (req, res) => res.json({ messages: devOutbox() }));

// GET /api/dev/accounts: seeded and test accounts for the quick-login panel.
router.get(
  '/accounts',
  asyncRoute(async (req, res) => {
    if (!devLoginEnabled) return res.json({ enabled: false, accounts: [] });
    const { rows } = await query(
      `SELECT user_id, full_name, email, role, email_verified, account_verification_status, account_status
       FROM users WHERE email LIKE '%@sulyap.site' OR email LIKE '%@example.com'
       ORDER BY CASE role WHEN 'administrator' THEN 0 WHEN 'tourism_officer' THEN 1 ELSE 2 END, full_name`,
    );
    res.json({
      enabled: true,
      accounts: rows.map((u) => ({
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        verification: verificationState(u),
        accountStatus: u.account_status,
      })),
    });
  }),
);

// POST /api/dev/login-as  { email }: signs in without a password (ENABLE_DEV_LOGIN=true only).
router.post(
  '/login-as',
  asyncRoute(async (req, res) => {
    if (!devLoginEnabled) throw forbidden('Developer login is turned off.');
    const { email } = validate(z.object({ email: z.string().trim().toLowerCase() }), req.body);
    const { rows } = await query('SELECT user_id FROM users WHERE lower(email) = $1', [email]);
    const user = rows[0] && (await findUserById(rows[0].user_id));
    if (!user) throw notFound('No account with that e-mail.');
    if (user.account_status !== 'active') throw forbidden('That account is suspended.');
    setSessionCookie(res, user);
    res.json({ user: await toClientUser(user) });
  }),
);

// POST /api/dev/newsletter  { month?: "YYYY-MM" }: sends the newsletter now (default: this month)
// so it can be checked in the outbox without waiting for the scheduler.
router.post(
  '/newsletter',
  asyncRoute(async (req, res) => {
    const { month } = validate(
      z.object({
        month: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .optional(),
      }),
      req.body || {},
    );
    const thisMonth = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 7);
    res.json(await runNewsletter({ month: month || thisMonth, force: true }));
  }),
);

export default router;
