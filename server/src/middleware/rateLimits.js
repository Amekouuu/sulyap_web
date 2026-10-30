// Limits on how often someone can try to log in, sign up, or send e-mails.
import { rateLimit } from 'express-rate-limit';

function limiter(minutes, limit, message) {
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { code: 'too_many_requests', message } }),
  });
}

export const loginLimiter = limiter(
  15,
  10,
  'Too many login attempts. Please wait 15 minutes and try again.',
);
export const signupLimiter = limiter(
  60,
  10,
  'Too many sign-ups from this network. Please try again later.',
);
export const emailLimiter = limiter(
  15,
  5,
  'Too many e-mail requests. Please wait a few minutes and try again.',
);
// Nominations, reviews, photos, and reports: generous for real use, stops floods.
export const contributionLimiter = limiter(
  60,
  60,
  'You are posting very quickly. Please wait a while and try again.',
);
export const passwordLimiter = limiter(
  15,
  10,
  'Too many password attempts. Please wait 15 minutes and try again.',
);
// Address look-ups go to OpenStreetMap's free geocoder, which asks for light use.
export const geocodeLimiter = limiter(
  10,
  20,
  'Too many address searches. Please wait a few minutes, or drop a pin on the map instead.',
);
