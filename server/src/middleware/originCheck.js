import { config } from '../config.js';
import { forbidden } from '../errors.js';

// Blocks changes (POST, PUT, PATCH, DELETE) sent by other websites using a visitor's cookie.
// Requests without an Origin header, such as Postman, are allowed.
export function originCheck(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !config.clientOrigins.includes(origin)) {
    return next(forbidden('This request came from a website that is not allowed.'));
  }
  next();
}
