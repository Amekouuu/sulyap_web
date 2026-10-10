// Errors that should reach the client with a specific status code and message.
export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, 'bad_request', message, details);
export const unauthorized = (message = 'Please log in first.') =>
  new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'You do not have access to this.') =>
  new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message);
export const conflict = (message, details) => new HttpError(409, 'conflict', message, details);
