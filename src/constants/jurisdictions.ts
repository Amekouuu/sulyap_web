import type { Jurisdiction } from '@/types'

/*
  All 22 Pampanga LGUs: 3 cities and 19 municipalities.
  Seeded in full from the first commit so no nomination can reach a
  jurisdiction with no tourism officer to route to.
*/
const CITIES = ['Angeles City', 'City of San Fernando', 'Mabalacat City']

const MUNICIPALITIES = [
  'Apalit',
  'Arayat',
  'Bacolor',
  'Candaba',
  'Floridablanca',
  'Guagua',
  'Lubao',
  'Macabebe',
  'Magalang',
  'Masantol',
  'Mexico',
  'Minalin',
  'Porac',
  'San Luis',
  'San Simon',
  'Santa Ana',
  'Santa Rita',
  'Santo Tomas',
  'Sasmuan',
]

export const JURISDICTIONS: Jurisdiction[] = [
  ...CITIES.map((name, i) => ({
    jurisdiction_id: i + 1,
    name,
    type: 'city' as const,
    province: 'Pampanga',
  })),
  ...MUNICIPALITIES.map((name, i) => ({
    jurisdiction_id: CITIES.length + i + 1,
    name,
    type: 'municipality' as const,
    province: 'Pampanga',
  })),
]

export const JURISDICTION_BY_ID = new Map(
  JURISDICTIONS.map((j) => [j.jurisdiction_id, j]),
)
