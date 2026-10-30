// /api/internal: background jobs for an outside scheduler, protected by CRON_SECRET.
import crypto from 'node:crypto';
import { Router } from 'express';
import { config } from '../config.js';
import { forbidden } from '../errors.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { runIdCleanup } from '../jobs/idCleanup.js';
import { runNewsletter } from '../jobs/newsletter.js';

const router = Router();

function secretMatches(given) {
  if (!config.cronSecret || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(config.cronSecret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// POST /api/internal/jobs/id-cleanup  (header: x-cron-secret)
router.post(
  '/jobs/id-cleanup',
  asyncRoute(async (req, res) => {
    if (!secretMatches(req.get('x-cron-secret'))) throw forbidden('Missing or wrong job secret.');
    res.json({ removed: await runIdCleanup() });
  }),
);

// POST /api/internal/jobs/newsletter  (header: x-cron-secret; body: { month?: "YYYY-MM" })
// Sends last month's newsletter unless a month is given.
router.post(
  '/jobs/newsletter',
  asyncRoute(async (req, res) => {
    if (!secretMatches(req.get('x-cron-secret'))) throw forbidden('Missing or wrong job secret.');
    const month = typeof req.body?.month === 'string' ? req.body.month : undefined;
    res.json(await runNewsletter({ month }));
  }),
);

export default router;
