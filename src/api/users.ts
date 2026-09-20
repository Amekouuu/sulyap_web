import type { User } from '@/types'
import { db } from '@/mocks/store'
import { respond } from './client'

export async function listUsers(): Promise<User[]> {
  return respond(db.users)
}

export async function getUser(id: number): Promise<User | null> {
  return respond(db.users.find((u) => u.user_id === id) ?? null)
}

/** Accounts offered by the dev switcher: the residents, the admin, and 3 officers. */
export async function listSwitchableAccounts(): Promise<User[]> {
  const residents = db.users.filter((u) => u.role === 'registered_user')
  const admin = db.users.filter((u) => u.role === 'administrator')
  const officers = db.users
    .filter((u) => u.role === 'tourism_officer')
    .filter((u) => [206, 215, 221, 208].includes(u.user_id))
  return respond([...residents.slice(0, 2), ...admin, ...officers])
}
