// Reading users and describing their account state.
import { query } from '../db/pool.js';

const pool = { query };

export const USER_COLUMNS = `user_id, full_name, email, email_verified, email_verified_at, contact_number,
  home_address, address_latitude, address_longitude, id_type, id_document_url,
  account_verification_status, verified_by, verified_at, newsletter_opt_in, role, account_status,
  created_at`;

export async function findUserById(userId, db = pool) {
  const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM users WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

// Where a Registered User is in sign-up: email_unverified, no_id, pending, verified, rejected.
// Staff accounts return 'staff'.
export function verificationState(user) {
  if (user.role !== 'registered_user') return 'staff';
  if (!user.email_verified) return 'email_unverified';
  return user.account_verification_status || 'no_id';
}

// Contribution rights: e-mail verified, ID verified, and account active.
export function canContribute(user) {
  return (
    user.role === 'registered_user' &&
    user.email_verified &&
    user.account_verification_status === 'verified' &&
    user.account_status === 'active'
  );
}

// Officer jurisdictions as a list of names, or 'all' when every jurisdiction is assigned.
export async function officerJurisdictions(userId, db = pool) {
  const { rows } = await db.query(
    `SELECT j.name, (SELECT count(*) FROM jurisdictions)::int AS total
     FROM officer_jurisdictions oj JOIN jurisdictions j ON j.jurisdiction_id = oj.jurisdiction_id
     WHERE oj.officer_id = $1 ORDER BY j.name`,
    [userId],
  );
  if (rows.length && rows.length === rows[0].total) return 'all';
  return rows.map((row) => row.name);
}

// The reason given with the latest ID rejection (kept in the notification, not in the users table).
export async function latestVerificationNote(userId, db = pool) {
  const { rows } = await db.query(
    `SELECT message FROM notifications WHERE user_id = $1 AND type = 'account_verification'
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  return rows[0]?.message || null;
}

// What the browser is allowed to know about the signed-in user.
export async function toClientUser(user, db = pool) {
  const state = verificationState(user);
  const { rows } = await db.query(
    'SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND NOT is_read',
    [user.user_id],
  );
  return {
    id: user.user_id,
    fullName: user.full_name,
    email: user.email,
    contactNumber: user.contact_number,
    role: user.role,
    accountStatus: user.account_status,
    verification: state,
    idType: user.id_type,
    verificationNote: state === 'rejected' ? await latestVerificationNote(user.user_id, db) : null,
    canContribute: canContribute(user),
    newsletterOptIn: user.newsletter_opt_in,
    homeAddress: user.home_address,
    hasHomeLocation: user.address_latitude !== null,
    jurisdictions:
      user.role === 'tourism_officer' ? await officerJurisdictions(user.user_id, db) : null,
    unreadNotifications: rows[0].n,
  };
}
