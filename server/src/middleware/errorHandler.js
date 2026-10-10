import { HttpError } from '../errors.js';

// Every error response has the same shape: { error: { code, message, details? } }.
export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'not_found', message: 'This API route does not exist.' } });
}

// Express only treats a middleware as an error handler when it takes four arguments.
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    const body = { code: err.code, message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json({ error: body });
  }
  if (err.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json({ error: { code: 'bad_json', message: 'The request body is not valid JSON.' } });
  }
  // Unexpected errors: log on the server, never leak details to the client.
  console.error(err);
  return res
    .status(500)
    .json({ error: { code: 'server_error', message: 'Something went wrong. Please try again.' } });
}
