// Shared field rules for request validation (zod schemas).
import { z } from 'zod';

// Accepted government IDs (the client shows the same list). The ID number itself is never stored.
export const ID_TYPES = [
  'PhilSys National ID',
  "Driver's License",
  'Passport',
  'UMID',
  'PRC ID',
  'Postal ID',
  'Other government ID',
];

export const emailField = z
  .string({ error: 'Enter your e-mail address.' })
  .trim()
  .toLowerCase()
  .max(255, 'That e-mail address is too long.')
  .pipe(z.email('Enter a valid e-mail address.'));

// Philippine mobile numbers, stored as +639XXXXXXXXX (13 characters).
export const contactNumberField = z
  .string({ error: 'Enter your contact number.' })
  .trim()
  .transform((value) => value.replace(/[\s().-]/g, ''))
  .refine((value) => /^(09\d{9}|\+639\d{9}|639\d{9})$/.test(value), {
    message: 'Enter a mobile number like 0917 123 4567.',
  })
  .transform((value) => `+63${value.slice(-10)}`);

export const passwordField = z
  .string({ error: 'Enter a password.' })
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Use 72 characters or fewer.')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: 'Use at least one letter and one number.',
  });

export const fullNameField = z
  .string({ error: 'Enter your full name.' })
  .trim()
  .min(2, 'Enter your full name.')
  .max(150, 'That name is too long.');
