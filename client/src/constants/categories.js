import { Drama, Landmark, Mountain, PartyPopper, Sun, UtensilsCrossed } from 'lucide-react';

// The six destination categories from the manuscript. Icons and colors follow the mockup.
export const CATEGORIES = [
  { name: 'Leisure', icon: Sun, color: '#76D6A6' },
  { name: 'Adventure', icon: Mountain, color: '#234638' },
  { name: 'Culinary', icon: UtensilsCrossed, color: '#D9E0DB' },
  { name: 'Cultural', icon: Drama, color: '#9DB8A9' },
  { name: 'Historical', icon: Landmark, color: '#E3AA45' },
  { name: 'Festivities', icon: PartyPopper, color: '#C9653B' },
];

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

export function categoryIcon(name) {
  return CATEGORIES.find((c) => c.name === name)?.icon || Sun;
}
