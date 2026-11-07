// /api/notifications: the signed-in user's in-app notifications (bell and Notifications page),
// and /api/newsletter/unsubscribe for the one-click link in the newsletter.
import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, notFound } from '../errors.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { validate } from '../lib/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { unsubscribeSignatureMatches } from '../jobs/newsletter.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

const PAGE_SIZE = 20;

// GET /api/notifications?unread=true&page=1
notificationsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const f = validate(
      z.object({
        unread: z.enum(['true', 'false']).optional(),
        page: z.coerce.number().int().min(1).max(500).optional().default(1),
      }),
      req.query,
    );
    const [list, counts] = await Promise.all([
      query(
        `SELECT notification_id, type, message, is_read, created_at, count(*) OVER () AS total
         FROM notifications
         WHERE user_id = $1 AND ($2::boolean IS NOT TRUE OR NOT is_read)
         ORDER BY created_at DESC, notification_id DESC
         LIMIT $3 OFFSET $4`,
        [req.user.user_id, f.unread === 'true', PAGE_SIZE, (f.page - 1) * PAGE_SIZE],
      ),
      query(
        'SELECT count(*) FILTER (WHERE NOT is_read)::int AS unread FROM notifications WHERE user_id = $1',
        [req.user.user_id],
      ),
    ]);
    res.json({
      notifications: list.rows.map((n) => ({
        id: n.notification_id,
        type: n.type,
        message: n.message,
        isRead: n.is_read,
        createdAt: n.created_at,
      })),
      total: list.rows[0] ? Number(list.rows[0].total) : 0,
      unread: counts.rows[0].unread,
      page: f.page,
      pageSize: PAGE_SIZE,
    });
  }),
);

// POST /api/notifications/read-all
notificationsRouter.post(
  '/read-all',
  asyncRoute(async (req, res) => {
    await query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND NOT is_read', [
      req.user.user_id,
    ]);
    res.status(204).end();
  }),
);

// POST /api/notifications/:id/read
notificationsRouter.post(
  '/:id/read',
  asyncRoute(async (req, res) => {
    const { id } = validate(z.object({ id: z.coerce.number().int().positive() }), req.params);
    const { rowCount } = await query(
      'UPDATE notifications SET is_read = true WHERE notification_id = $1 AND user_id = $2',
      [id, req.user.user_id],
    );
    if (!rowCount) throw notFound('Notification not found.');
    res.status(204).end();
  }),
);

export const newsletterRouter = Router();

// POST /api/newsletter/unsubscribe  { u, t }: works without logging in, from the e-mail link.
newsletterRouter.post(
  '/unsubscribe',
  asyncRoute(async (req, res) => {
    const { u, t } = validate(
      z.object({ u: z.coerce.number().int().positive(), t: z.string().min(10).max(100) }),
      req.body,
    );
    if (!unsubscribeSignatureMatches(u, t)) {
      throw new HttpError(400, 'invalid_link', 'This unsubscribe link is not valid.');
    }
    await query('UPDATE users SET newsletter_opt_in = false WHERE user_id = $1', [u]);
    res.json({ unsubscribed: true });
  }),
);
