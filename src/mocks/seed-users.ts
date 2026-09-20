import type { User } from '@/types'
import { JURISDICTIONS } from '@/constants/jurisdictions'
import { ts } from './helpers'

const RESIDENTS: User[] = (
  [
    ['Juan Dela Cruz', 'juandelacruz@gmail.com', '+639171234567',
      'Barangay Del Pilar, City of San Fernando, Pampanga', 15.0349, 120.6899, 'verified'],
    ['Maria Santos', 'maria.santos@gmail.com', '+639181234567',
      'Barangay Balibago, Angeles City, Pampanga', 15.145, 120.593, 'verified'],
    ['Ana Reyes', 'ana.reyes@gmail.com', '+639191234567',
      'Barangay Dau, Mabalacat City, Pampanga', 15.2216, 120.5736, 'verified'],
    // Left pending on purpose, so the submission gate has something to block.
    ['Lito Cruz', 'lito.cruz@gmail.com', '+639201234567',
      'Barangay Sta. Filomena, Guagua, Pampanga', 14.9667, 120.6333, 'pending'],
  ] as const
).map(([full_name, email, contact_number, home_address, lat, lng, verification], i) => ({
  user_id: i + 1,
  full_name,
  email,
  contact_number,
  id_document_url: verification === 'pending' ? null : '/uploads/id-placeholder.jpg',
  account_verification_status: verification,
  home_address,
  address_coordinates: { lat, lng },
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
  contact_number: '+639000000000',
  id_document_url: null,
  account_verification_status: 'verified' as const,
  home_address: null,
  address_coordinates: null,
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
  contact_number: '+639000000000',
  id_document_url: null,
  account_verification_status: 'verified' as const,
  home_address: null,
  address_coordinates: null,
  role: 'tourism_officer' as const,
  jurisdiction_id: j.jurisdiction_id,
  account_status: 'active' as const,
  created_at: ts('2026-06-01'),
  updated_at: ts('2026-06-01'),
}))

export const SEED_USERS: User[] = [...RESIDENTS, ADMIN, ...OFFICERS]
