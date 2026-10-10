// Thin wrapper over fetch for the Express API.
// Sends the session cookie, encodes JSON, and turns error responses into ApiError.
const BASE_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      credentials: 'include',
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(
      0,
      'network_error',
      'Could not reach Sulyap. Check your connection and try again.',
    );
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const err = data?.error || {};
    throw new ApiError(
      response.status,
      err.code || 'error',
      err.message || 'Something went wrong. Please try again.',
      err.details,
    );
  }
  return data;
}
