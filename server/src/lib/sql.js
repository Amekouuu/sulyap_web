// Small helpers for building SQL parameters.

// Wraps text for ILIKE and escapes % and _ so a search for "50%" matches literally.
export const likePattern = (text) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;
