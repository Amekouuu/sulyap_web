// npm run storage:setup: creates the Supabase Storage buckets (safe to run again).
import { ensureBuckets } from '../src/lib/storage.js';

try {
  await ensureBuckets();
  console.log('Storage buckets ready.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
