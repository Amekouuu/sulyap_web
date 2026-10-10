import type { Category } from '@/types'

/*
  The canonical category list. The wireframes carried three conflicting
  vocabularies; this resolves them. No component may inline a category string -
  import from here so the filter row and the nomination form cannot drift apart.
*/
export const CATEGORIES: Category[] = [
  {
    category_id: 1,
    category_name: 'Cultural',
    description:
      'Living traditions, craft, festivals, and community practice.',
  },
  {
    category_id: 2,
    category_name: 'Historical',
    description:
      'Heritage churches, ancestral houses, markers, and colonial-era structures.',
  },
  {
    category_id: 3,
    category_name: 'Natural',
    description:
      'Wetlands, rivers, uplands, caves, and scenic landscapes.',
  },
  {
    category_id: 4,
    category_name: 'Ecotourism',
    description:
      'Conservation areas and community-managed sites with a stewardship focus.',
  },
  {
    category_id: 5,
    category_name: 'Culinary',
    description:
      'Food traditions, producers, and the places behind Pampanga kitchens.',
  },
  {
    category_id: 6,
    category_name: 'Adventure',
    description: 'Trails, climbs, paddling, and outdoor activity.',
  },
  {
    category_id: 7,
    category_name: 'Other',
    description: 'Anything the categories above do not cover.',
  },
]

export const CATEGORY_BY_ID = new Map(
  CATEGORIES.map((c) => [c.category_id, c]),
)
