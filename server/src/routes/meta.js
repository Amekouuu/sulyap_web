// Public reference data used by forms and filters.
import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncRoute } from '../lib/asyncRoute.js';

const router = Router();

// GET /api/jurisdictions
router.get(
  '/jurisdictions',
  asyncRoute(async (req, res) => {
    const { rows } = await query(
      'SELECT jurisdiction_id AS id, name, type FROM jurisdictions ORDER BY name',
    );
    res.json({ jurisdictions: rows });
  }),
);

// GET /api/categories
router.get(
  '/categories',
  asyncRoute(async (req, res) => {
    const { rows } = await query(
      'SELECT category_id AS id, category_name AS name, description FROM categories ORDER BY category_id',
    );
    res.json({ categories: rows });
  }),
);

export default router;
