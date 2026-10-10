const dateFormat = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

// "Sep 12, 2026"
export function formatDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
}

// First letters of the first two words: "Juan Dela Cruz" -> "JD", "Micko Alberto" -> "MA".
// (Filipino surnames such as "Dela Cruz" span two words, so the last word is not used.)
export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

// 16.27 -> "16.3 km"
export function formatKm(km) {
  return `${km.toFixed(1)} km`;
}

export function plural(count, one, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}
