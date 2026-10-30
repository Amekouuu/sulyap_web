// Login sessions: a signed token (JWT) in an httpOnly cookie that page scripts cannot read.
import jwt from 'jsonwebtoken';
import { config, isProduction } from '../config.js';
import { forbidden, unauthorized } from '../errors.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { canContribute, findUserById } from '../services/users.js';

const COOKIE = 'sulyap_session';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
  };
}

export function setSessionCookie(res, user) {
  if (!config.jwtSecret) throw new Error('JWT_SECRET is not set in server/.env.');
  const token = jwt.sign({ sub: String(user.user_id), role: user.role }, config.jwtSecret, {
    expiresIn: `${config.sessionDays}d`,
  });
  res.cookie(COOKIE, token, cookieOptions());
}

export function clearSessionCookie(res) {
  const { maxAge: _maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE, options);
}

// Runs on every request: puts the signed-in user (fresh from the database) on req.user.
// Suspended accounts are signed out here, so they cannot keep using an old session.
export const loadSession = asyncRoute(async (req, res, next) => {
  req.user = null;
  const token = req.cookies?.[COOKIE];
  if (!token || !config.jwtSecret) return next();
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    clearSessionCookie(res);
    return next();
  }
  const user = await findUserById(Number(payload.sub));
  if (!user || user.account_status !== 'active') {
    clearSessionCookie(res);
    return next();
  }
  req.user = user;
  next();
});

export function requireAuth(req, res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };

// Reviews, photos, reports, and nominations need a verified e-mail and a verified ID.
export function requireContributor(req, res, next) {
  if (!req.user) return next(unauthorized());
  if (!canContribute(req.user)) {
    return next(forbidden('Your ID must be verified before you can post. Check Account Settings.'));
  }
  next();
}
