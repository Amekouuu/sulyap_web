// Supabase Storage, used only from the server with the secret key.
//   id-documents       private: ID photos, viewed by admins through short-lived signed links
//   destination-photos public:  approved destination and review photos (Phase B3)
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export const BUCKETS = {
  ids: 'id-documents',
  photos: 'destination-photos',
};

let client = null;
function storage() {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in server/.env.');
  }
  client ||= createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client.storage;
}

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png' };

// Saves an uploaded ID photo under a random name and returns its storage path.
export async function saveIdImage(userId, file) {
  const path = `${userId}/${crypto.randomUUID()}.${EXTENSIONS[file.mimetype]}`;
  const { error } = await storage()
    .from(BUCKETS.ids)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) throw new Error(`Could not store the ID image: ${error.message}`);
  return path;
}

// A link to view an ID image that stops working after a few minutes.
export async function signedIdImageUrl(path, seconds = 300) {
  const { data, error } = await storage().from(BUCKETS.ids).createSignedUrl(path, seconds);
  if (error) throw new Error(`Could not open the ID image: ${error.message}`);
  return data.signedUrl;
}

export async function deleteIdImage(path) {
  const { error } = await storage().from(BUCKETS.ids).remove([path]);
  if (error) throw new Error(`Could not delete the ID image: ${error.message}`);
}

// Saves a destination or review photo in the public bucket and returns its public address.
// folder is "nominations/<id>" or "reviews/<id>". Pending photos are only listed by the API
// after an administrator approves them.
export async function savePhoto(folder, file) {
  const path = `${folder}/${crypto.randomUUID()}.${EXTENSIONS[file.mimetype]}`;
  const api = storage().from(BUCKETS.photos);
  const { error } = await api.upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) throw new Error(`Could not store the photo: ${error.message}`);
  return api.getPublicUrl(path).data.publicUrl;
}

// Deletes a photo saved by savePhoto. Demo photos (served by the website) are left alone.
export async function deletePhoto(url) {
  const marker = `/object/public/${BUCKETS.photos}/`;
  const at = url?.indexOf(marker) ?? -1;
  if (at < 0) return;
  const { error } = await storage()
    .from(BUCKETS.photos)
    .remove([decodeURIComponent(url.slice(at + marker.length))]);
  if (error) throw new Error(`Could not delete the photo: ${error.message}`);
}

// Creates the buckets if they do not exist yet. Safe to run more than once.
export async function ensureBuckets(log = console.log) {
  const api = storage();
  const { data: existing, error } = await api.listBuckets();
  if (error) throw new Error(`Could not list storage buckets: ${error.message}`);
  const names = new Set(existing.map((b) => b.name));
  const wanted = [
    { name: BUCKETS.ids, public: false },
    { name: BUCKETS.photos, public: true },
  ];
  for (const bucket of wanted) {
    const options = {
      public: bucket.public,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png'],
    };
    const result = names.has(bucket.name)
      ? await api.updateBucket(bucket.name, options)
      : await api.createBucket(bucket.name, options);
    if (result.error) throw new Error(`Bucket ${bucket.name}: ${result.error.message}`);
    log(
      `  ${names.has(bucket.name) ? 'updated' : 'created'} ${bucket.name} (${bucket.public ? 'public' : 'private'})`,
    );
  }
}
