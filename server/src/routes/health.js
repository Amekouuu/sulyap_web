import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

// GET /api/health: confirms the API is up and whether the database answers.
router.get('/', async (req, res) => {
  let database = 'not_configured';
  if (pool) {
    try {
      await pool.query('SELECT 1');
      database = 'connected';
    } catch {
      database = 'unreachable';
    }
  }
  res.json({ status: 'ok', database });
});

export default router;
