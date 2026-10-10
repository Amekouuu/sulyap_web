// Fixed reference data from the manuscript (scope, categories, classification criteria)
// and the seeded staff accounts. Seeds read from here; nothing else is hard-coded in SQL.

export const PROVINCE = 'Pampanga';

// The 3 cities and 19 municipalities of Pampanga.
export const JURISDICTIONS = [
  { name: 'Angeles City', type: 'city' },
  { name: 'City of San Fernando', type: 'city' },
  { name: 'Mabalacat City', type: 'city' },
  { name: 'Apalit', type: 'municipality' },
  { name: 'Arayat', type: 'municipality' },
  { name: 'Bacolor', type: 'municipality' },
  { name: 'Candaba', type: 'municipality' },
  { name: 'Floridablanca', type: 'municipality' },
  { name: 'Guagua', type: 'municipality' },
  { name: 'Lubao', type: 'municipality' },
  { name: 'Macabebe', type: 'municipality' },
  { name: 'Magalang', type: 'municipality' },
  { name: 'Masantol', type: 'municipality' },
  { name: 'Mexico', type: 'municipality' },
  { name: 'Minalin', type: 'municipality' },
  { name: 'Porac', type: 'municipality' },
  { name: 'San Luis', type: 'municipality' },
  { name: 'San Simon', type: 'municipality' },
  { name: 'Santa Ana', type: 'municipality' },
  { name: 'Santa Rita', type: 'municipality' },
  { name: 'Santo Tomas', type: 'municipality' },
  { name: 'Sasmuan', type: 'municipality' },
];

export const CATEGORIES = [
  {
    name: 'Leisure',
    description: 'Places to relax and unwind, such as farms, resorts, parks, rivers, and lakes.',
  },
  {
    name: 'Adventure',
    description:
      'Outdoor experiences that take some effort, such as trails, waterfalls, canyons, and caves.',
  },
  {
    name: 'Culinary',
    description:
      'Food and culinary establishments, local delicacies, and food-related experiences.',
  },
  {
    name: 'Cultural',
    description:
      'Places and practices that show local culture, crafts, arts, and community traditions.',
  },
  {
    name: 'Historical',
    description: 'Heritage sites, old structures, and places tied to local history.',
  },
  {
    name: 'Festivities',
    description: 'Local festivals, fiestas, and other recurring community events.',
  },
];

// criterion_id 1 must stay the review-count criterion (see destination_criteria constraint).
export const CRITERIA = [
  {
    id: 1,
    name: 'Absence from other review platforms',
    description:
      'Not listed on Google Maps or TripAdvisor, or has no more than five reviews on each platform. Each platform is checked separately; the counts are not added together.',
  },
  {
    id: 2,
    name: 'Absence from official promotional materials',
    description:
      'Not mentioned in official government promotion: the ACTOP Facebook page, Tourism Region III Office promotions, or the official page of the municipality or its tourism office.',
  },
  {
    id: 3,
    name: 'Absence from mainstream travel media',
    description:
      'Not featured in guidebooks, the DOT "Love the Philippines" pages, the "LOVE Pampanga" segment on CLTV36, or commercial tours.',
  },
];

// The study setup: one shared administrator account and one Local Tourism Officer account
// covering all jurisdictions, both operated by the development team. The two single-city officer
// accounts used to test routing are temporary test accounts (see seeds/demo-data.js).
export const STAFF_ACCOUNTS = [
  { fullName: 'Sulyap Administrator', email: 'admin@sulyap.site', role: 'administrator' },
  {
    fullName: 'Local Tourism Officer (All jurisdictions)',
    email: 'lto.main@sulyap.site',
    role: 'tourism_officer',
    jurisdictions: 'all',
  },
];
