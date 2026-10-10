/**
 * Parses the Destinations.active_months string into calendar month numbers.
 *
 * The paper types the field as a string rather than a structured array, so
 * the parsing burden sits here. Handles the three shapes an officer is
 * likely to enter:
 *
 *   "11,12,1,2"              numeric list
 *   "November to February"   a wrapping range of month names
 *   "Year round"             every month
 *
 * Returns an empty array when nothing can be read, which the seasonal boost
 * treats as "no boost" rather than guessing.
 */
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

function monthIndex(word: string): number | null {
  const w = word.trim().toLowerCase()
  if (!w) return null
  const i = MONTHS.findIndex((m) => m.startsWith(w.slice(0, 3)))
  return i === -1 ? null : i + 1
}

export function parseActiveMonths(input: string | null): number[] {
  if (!input) return []
  const raw = input.trim().toLowerCase()
  if (!raw) return []

  if (/year[\s-]?round|all year|any time/.test(raw)) {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  }

  // Numeric list: "11,12,1,2"
  if (/^[\d\s,]+$/.test(raw)) {
    return [
      ...new Set(
        raw
          .split(/[,\s]+/)
          .map(Number)
          .filter((n) => n >= 1 && n <= 12),
      ),
    ].sort((a, b) => a - b)
  }

  // Range: "November to February" - wraps across the year end.
  const range = raw.match(/([a-z]+)\s*(?:to|-|–|until|through)\s*([a-z]+)/)
  if (range) {
    const from = monthIndex(range[1])
    const to = monthIndex(range[2])
    if (from && to) {
      const out: number[] = []
      let m = from
      // Walk forward, wrapping at December, until `to` is included.
      for (let guard = 0; guard < 12; guard++) {
        out.push(m)
        if (m === to) break
        m = m === 12 ? 1 : m + 1
      }
      return out
    }
  }

  // Comma or "and" separated month names.
  const named = raw
    .split(/[,;]|\band\b/)
    .map(monthIndex)
    .filter((n): n is number => n !== null)
  return [...new Set(named)].sort((a, b) => a - b)
}

/** True when the destination is in season for the given month. */
export function isInSeason(activeMonths: string | null, month: number): boolean {
  const months = parseActiveMonths(activeMonths)
  return months.length > 0 && months.includes(month)
}
