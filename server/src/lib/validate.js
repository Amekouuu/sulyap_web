import { badRequest } from '../errors.js';

// Checks req.body (or another object) against a zod schema.
// Returns the cleaned data, or throws a 400 listing each field that is wrong.
export function validate(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (result.success) return result.data;
  const details = result.error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
  throw badRequest(details[0]?.message || 'Please check the form and try again.', details);
}
