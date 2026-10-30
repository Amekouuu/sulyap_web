import crypto from 'node:crypto';

// A random token for e-mail links. Only its SHA-256 hash is stored in the database.
export function newToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}
