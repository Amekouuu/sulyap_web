// /api/admin/users and /api/admin/officers: account list, suspension, officer jurisdictions.
import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../../db/pool.js';
import { badRequest, forbidden, notFound } from '../../errors.js';
import { asyncRoute } from '../../lib/asyncRoute.js';
import { likePattern } from '../../lib/sql.js';
import { validate } from '../../lib/validate.js';
import { verificationState } from '../../services/users.js';

const router = Router();
const PAGE_SIZE = 50;
const idParam = z.object({ id: z.coerce.number().int().positive() });

// GET /api/admin/users?role=registered_user|tourism_officer|administrator&q=&page=1
router.get(
  '/users',
  asyncRoute(async (req, res) => {
    const filters = validate(
      z.object({
        role: z.enum(['registered_user', 'tourism_officer', 'administrator']).optional(),
        q: z.string().trim().max(100).optional(),
        page: z.coerce.number().int().min(1).optional().default(1),
      }),
      req.query,
    );
    const params = [
      filters.role || null,
      filters.q ? likePattern(filters.q) : null,
      PAGE_SIZE,
      (filters.page - 1) * PAGE_SIZE,
    ];
    const { rows } = await query(
      `SELECT u.user_id, u.full_name, u.email, u.role, u.account_status, u.email_verified,
         u.account_verification_status, u.home_address, u.created_at,
         (SELECT array_agg(j.name ORDER BY j.name) FROM officer_jurisdictions oj
          JOIN jurisdictions j ON j.jurisdiction_id = oj.jurisdiction_id WHERE oj.officer_id = u.user_id) AS jurisdictions
       FROM users u
       WHERE ($1::text IS NULL OR u.role = $1)
         AND ($2::text IS NULL OR u.full_name ILIKE $2 OR u.email ILIKE $2)
       ORDER BY CASE u.role WHEN 'registered_user' THEN 0 WHEN 'administrator' THEN 1 ELSE 2 END, u.created_at DESC
       LIMIT $3 OFFSET $4`,
      params,
    );
    const counts = await query('SELECT role, count(*)::int AS n FROM users GROUP BY role');
    const total = (await query('SELECT count(*)::int AS n FROM jurisdictions')).rows[0].n;
    res.json({
      users: rows.map((u) => ({
        id: u.user_id,
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        accountStatus: u.account_status,
        verification: verificationState(u),
        homeAddress: u.home_address,
        registeredAt: u.created_at,
        jurisdictions:
          u.role === 'tourism_officer'
            ? u.jurisdictions?.length === total
              ? 'all'
              : u.jurisdictions || []
            : null,
      })),
      counts: Object.fromEntries(counts.rows.map((r) => [r.role, r.n])),
      page: filters.page,
      pageSize: PAGE_SIZE,
    });
  }),
);

// PATCH /api/admin/users/:id/status  { status: 'active' | 'suspended' }
router.patch(
  '/users/:id/status',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const { status } = validate(z.object({ status: z.enum(['active', 'suspended']) }), req.body);
    if (id === req.user.user_id)
      throw forbidden('You cannot change the status of your own account.');
    const { rows } = await query('SELECT role FROM users WHERE user_id = $1', [id]);
    if (!rows[0]) throw notFound('User not found.');
    if (rows[0].role === 'administrator')
      throw forbidden('Administrator accounts cannot be suspended here.');
    await query('UPDATE users SET account_status = $2 WHERE user_id = $1', [id, status]);
    res.json({ id, accountStatus: status });
  }),
);

// GET /api/admin/officers/:id/jurisdictions: every jurisdiction, and which ones this officer covers.
router.get(
  '/officers/:id/jurisdictions',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const officer = await query(
      `SELECT full_name FROM users WHERE user_id = $1 AND role = 'tourism_officer'`,
      [id],
    );
    if (!officer.rows[0]) throw notFound('Officer not found.');
    const all = await query(
      'SELECT jurisdiction_id AS id, name, type FROM jurisdictions ORDER BY type, name',
    );
    const assigned = await query(
      'SELECT jurisdiction_id FROM officer_jurisdictions WHERE officer_id = $1',
      [id],
    );
    res.json({
      officer: { id, fullName: officer.rows[0].full_name },
      jurisdictions: all.rows,
      assigned: assigned.rows.map((r) => r.jurisdiction_id),
    });
  }),
);

// PUT /api/admin/officers/:id/jurisdictions  { jurisdictionIds: [..] }  (at least one)
router.put(
  '/officers/:id/jurisdictions',
  asyncRoute(async (req, res) => {
    const { id } = validate(idParam, req.params);
    const { jurisdictionIds } = validate(
      z.object({
        jurisdictionIds: z
          .array(z.number().int().positive())
          .min(1, 'An officer needs at least one jurisdiction.'),
      }),
      req.body,
    );
    await withTransaction(async (db) => {
      const officer = await db.query(
        `SELECT 1 FROM users WHERE user_id = $1 AND role = 'tourism_officer'`,
        [id],
      );
      if (!officer.rowCount) throw notFound('Officer not found.');
      const known = await db.query(
        'SELECT count(*)::int AS n FROM jurisdictions WHERE jurisdiction_id = ANY ($1::int[])',
        [jurisdictionIds],
      );
      if (known.rows[0].n !== new Set(jurisdictionIds).size)
        throw badRequest('One of the jurisdictions does not exist.');
      await db.query(
        'DELETE FROM officer_jurisdictions WHERE officer_id = $1 AND NOT (jurisdiction_id = ANY ($2::int[]))',
        [id, jurisdictionIds],
      );
      await db.query(
        `INSERT INTO officer_jurisdictions (officer_id, jurisdiction_id)
         SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING`,
        [id, jurisdictionIds],
      );
    });
    res.json({ id, assigned: [...new Set(jurisdictionIds)] });
  }),
);

export default router;
