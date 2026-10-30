// /api/auth: sign up, e-mail verification, log in and out, and "who am I".
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { HttpError, conflict } from '../errors.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { verificationEmail } from '../lib/emails.js';
import { sendMailSafely } from '../lib/mailer.js';
import { contactNumberField, emailField, fullNameField, passwordField } from '../lib/rules.js';
import { hashToken, newToken } from '../lib/tokens.js';
import { validate } from '../lib/validate.js';
import { clearSessionCookie, setSessionCookie } from '../middleware/auth.js';
import { emailLimiter, loginLimiter, signupLimiter } from '../middleware/rateLimits.js';
import { USER_COLUMNS, findUserById, toClientUser } from '../services/users.js';

export const BCRYPT_COST = 12;
const RESEND_WAIT_SECONDS = 60;

const router = Router();

const signupSchema = z.object({
  fullName: fullNameField,
  email: emailField,
  contactNumber: contactNumberField,
  password: passwordField,
  acceptTerms: z.boolean().refine((value) => value === true, {
    message: 'Please agree to the Terms of Use and the Data Privacy Notice.',
  }),
  newsletterOptIn: z.boolean().optional().default(false),
});

// Creates a new e-mail verification link for the user and returns the raw token for the e-mail.
async function issueVerificationToken(db, userId) {
  await db.query('DELETE FROM email_verification_tokens WHERE user_id = $1 AND used_at IS NULL', [
    userId,
  ]);
  const { token, hash } = newToken();
  await db.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '24 hours')`,
    [userId, hash],
  );
  return token;
}

// POST /api/auth/register
router.post(
  '/register',
  signupLimiter,
  asyncRoute(async (req, res) => {
    const data = validate(signupSchema, req.body);
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST);
    const { user, token } = await withTransaction(async (db) => {
      const taken = await db.query('SELECT 1 FROM users WHERE lower(email) = $1', [data.email]);
      if (taken.rowCount)
        throw conflict('An account with this e-mail already exists. Try logging in.');
      const { rows } = await db.query(
        `INSERT INTO users (full_name, email, contact_number, password_hash, role, newsletter_opt_in)
         VALUES ($1, $2, $3, $4, 'registered_user', $5)
         RETURNING ${USER_COLUMNS}`,
        [data.fullName, data.email, data.contactNumber, passwordHash, data.newsletterOptIn],
      );
      return { user: rows[0], token: await issueVerificationToken(db, rows[0].user_id) };
    });
    await sendMailSafely({
      to: user.email,
      ...verificationEmail({ fullName: user.full_name, token }),
    });
    setSessionCookie(res, user);
    res.status(201).json({ user: await toClientUser(user) });
  }),
);

// POST /api/auth/verify-email  { token }
router.post(
  '/verify-email',
  asyncRoute(async (req, res) => {
    const { token } = validate(
      z.object({ token: z.string().min(10, 'This link is not valid.') }),
      req.body,
    );
    const result = await withTransaction(async (db) => {
      const { rows } = await db.query(
        `SELECT t.token_id, t.user_id, t.used_at, t.expires_at < now() AS expired, u.email_verified
         FROM email_verification_tokens t JOIN users u ON u.user_id = t.user_id
         WHERE t.token_hash = $1 FOR UPDATE OF t`,
        [hashToken(token)],
      );
      const row = rows[0];
      if (!row) {
        throw new HttpError(
          400,
          'invalid_link',
          'This link is not valid. Request a new one below.',
        );
      }
      if (row.email_verified) return 'already_verified';
      if (row.used_at || row.expired) {
        throw new HttpError(410, 'link_expired', 'This link has expired. Request a new one below.');
      }
      await db.query('UPDATE email_verification_tokens SET used_at = now() WHERE token_id = $1', [
        row.token_id,
      ]);
      await db.query(
        'UPDATE users SET email_verified = true, email_verified_at = now() WHERE user_id = $1',
        [row.user_id],
      );
      return 'verified';
    });
    res.json({ status: result });
  }),
);

// POST /api/auth/resend-verification  { email }  (or the signed-in user)
// Always answers the same way, so it does not reveal which e-mails have accounts.
router.post(
  '/resend-verification',
  emailLimiter,
  asyncRoute(async (req, res) => {
    const email = req.user?.email || validate(z.object({ email: emailField }), req.body).email;
    const { rows } = await query(
      `SELECT u.user_id, u.full_name, u.email, u.email_verified, u.role,
         (SELECT max(t.expires_at) - interval '24 hours' FROM email_verification_tokens t
          WHERE t.user_id = u.user_id) AS last_sent
       FROM users u WHERE lower(u.email) = $1`,
      [email],
    );
    const user = rows[0];
    if (user && user.role === 'registered_user' && !user.email_verified) {
      const secondsSince = user.last_sent
        ? (Date.now() - new Date(user.last_sent).getTime()) / 1000
        : Infinity;
      if (secondsSince < RESEND_WAIT_SECONDS) {
        throw new HttpError(
          429,
          'too_soon',
          'Please wait a minute before asking for another link.',
        );
      }
      const token = await withTransaction((db) => issueVerificationToken(db, user.user_id));
      await sendMailSafely({
        to: user.email,
        ...verificationEmail({ fullName: user.full_name, token }),
      });
    }
    res.json({ ok: true });
  }),
);

// Compared against when the e-mail is unknown, so a wrong e-mail takes as long as a wrong password.
let dummyHash = null;

// POST /api/auth/login  { email, password }
router.post(
  '/login',
  loginLimiter,
  asyncRoute(async (req, res) => {
    const data = validate(
      z.object({
        email: emailField,
        password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.'),
      }),
      req.body,
    );
    const { rows } = await query(
      'SELECT user_id, password_hash, account_status FROM users WHERE lower(email) = $1',
      [data.email],
    );
    const found = rows[0];
    dummyHash ||= await bcrypt.hash('not-a-real-password', BCRYPT_COST);
    const matches = await bcrypt.compare(data.password, found?.password_hash || dummyHash);
    if (!found || !matches) {
      throw new HttpError(401, 'invalid_credentials', 'The e-mail or password is incorrect.');
    }
    if (found.account_status === 'suspended') {
      throw new HttpError(403, 'suspended', 'This account is suspended. Contact the Sulyap team.');
    }
    const user = await findUserById(found.user_id);
    setSessionCookie(res, user);
    res.json({ user: await toClientUser(user) });
  }),
);

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

// GET /api/auth/me: the signed-in user, or null for guests.
router.get(
  '/me',
  asyncRoute(async (req, res) => {
    res.json({ user: req.user ? await toClientUser(req.user) : null });
  }),
);

export default router;
