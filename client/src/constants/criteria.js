// The three classification criteria agreed with ACTOP (manuscript, Scope and Delimitations).
// A destination is endorsed only when all three are met.
export const CRITERIA = [
  {
    id: 1,
    title: 'Absence from other review platforms',
    text: 'Not listed on Google Maps or TripAdvisor, or has no more than five reviews on each. Each platform is checked separately; the counts are not added together.',
  },
  {
    id: 2,
    title: 'Absence from official promotional materials',
    text: 'Not mentioned on the ACTOP Facebook page, Tourism Region III Office promotions, or the official page of the municipality or its tourism office.',
  },
  {
    id: 3,
    title: 'Absence from mainstream travel media',
    text: 'Not featured in guidebooks, the DOT "Love the Philippines" pages, the "LOVE Pampanga" segment on CLTV36, or commercial tours.',
  },
];

// Review-count cutoff for the first criterion, agreed with ACTOP. Checked per platform.
export const REVIEW_COUNT_LIMIT = 5;
