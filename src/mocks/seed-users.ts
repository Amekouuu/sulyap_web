import type { User } from '@/types'
import { JURISDICTIONS } from '@/constants/jurisdictions'
import { ts } from './helpers'

const RESIDENTS: User[] = (
  [
    ['Juan Dela Cruz', 'juandelacruz@gmail.com'],
    ['Maria Santos', 'maria.santos@gmail.com'],
    ['Ana Reyes', 'ana.reyes@gmail.com'],
    ['Lito Cruz', 'lito.cruz@gmail.com'],
  ] as const
).map(([full_name, email], i) => ({
  user_id: i + 1,
  full_name,
  email,
  role: 'registered_user' as const,
  jurisdiction_id: null,
  account_status: 'active' as const,
  created_at: ts('2026-07-04'),
  updated_at: ts('2026-07-04'),
}))

const ADMIN: User = {
  user_id: 100,
  full_name: 'Sulyap Administrator',
  email: 'admin@sulyap.online',
  role: 'administrator',
  jurisdiction_id: null,
  account_status: 'active',
  created_at: ts('2026-06-01'),
  updated_at: ts('2026-06-01'),
}

/* One officer per LGU. All 22 seeded so no jurisdiction can deadlock. */
const OFFICERS: User[] = JURISDICTIONS.map((j, i) => ({
  user_id: 200 + i,
  full_name: `Tourism Officer - ${j.name}`,
  email: `lto.${j.name.toLowerCase().replace(/[^a-z]+/g, '')}@sulyap.online`,
  role: 'tourism_officer' as const,
  jurisdiction_id: j.jurisdiction_id,
  account_status: 'active' as const,
  created_at: ts('2026-06-01'),
  updated_at: ts('2026-06-01'),
}))

export const SEED_USERS: User[] = [...RESIDENTS, ADMIN, ...OFFICERS]
