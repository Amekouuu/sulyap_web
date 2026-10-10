import { CloudRain, Sun } from 'lucide-react';

// Season tag set by the Local Tourism Officer at endorsement. Optional: untagged destinations
// still appear under "All" but not in the season filters.
export const SEASONS = [
  { value: 'Summer', label: 'Summer', icon: Sun },
  { value: 'Rainy', label: 'Rainy Season', icon: CloudRain },
];

// Accepted government IDs for account verification. The ID number itself is never stored.
export const ID_TYPES = [
  'PhilSys National ID',
  "Driver's License",
  'Passport',
  'UMID',
  'PRC ID',
  'Postal ID',
  'Other government ID',
];

// Preset reasons when reporting a review, photo, or destination.
export const REPORT_REASONS = [
  'Spam or advertising',
  'Self-promotion by the owner',
  'Wrong information',
  'Inappropriate content',
  'Not about a tourist spot in Pampanga',
];

// Upload rules from the manuscript (Scope and Delimitations).
export const PHOTO_RULES = {
  types: ['image/jpeg', 'image/png'],
  extensions: ['.jpg', '.jpeg', '.png'],
  maxBytes: 5 * 1024 * 1024,
  nomination: { min: 1, max: 5 },
  review: { min: 0, max: 3 },
  id: { min: 1, max: 1 },
};

// Nearby Lesser-Known search radius, in kilometers.
export const NEARBY_RADII = [5, 10, 20];
export const NEARBY_DEFAULT_RADIUS = 10;

// Required wording (system build spec, section 11).
export const DISCLAIMER_PRACTICAL =
  'User-submitted information. Fees, hours, and conditions may change. Please verify with the destination or the local tourism office before visiting.';
export const DISCLAIMER_DISTANCE =
  'Distances are straight-line and do not reflect travel routes or time.';
export const DISCLAIMER_ENDORSED =
  '"Endorsed" applies only to destinations checked by a Local Tourism Officer against criteria developed with the Arts, Culture & Tourism Office of Pampanga (ACTOP). It does not mean that ACTOP or any local government unit officially endorses individual destinations.';
