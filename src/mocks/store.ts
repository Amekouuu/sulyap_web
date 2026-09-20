import type {
  AdminVerificationLog,
  Destination,
  DestinationCategory,
  DestinationCriterion,
  DestinationImage,
  EndorsementLog,
  Report,
  Review,
  User,
} from '@/types'
import { SEED_USERS } from './seed-users'
import { SEED_DESTINATIONS } from './seed-destinations'
import {
  SEED_CRITERIA_ASSESSMENTS,
  SEED_DESTINATION_CATEGORIES,
  SEED_IMAGES,
  SEED_REVIEWS,
} from './seed-content'
import {
  SEED_ENDORSEMENT_LOGS,
  SEED_REPORTS,
  SEED_VERIFICATION_LOGS,
} from './seed-logs'

/*
  A mutable in-memory store standing in for MySQL until the Express API exists.
  It is mutable on purpose: nominating a destination must actually make it
  appear in the admin queue, or the workflow cannot be demonstrated.

  Mirrored to localStorage so a demo survives a refresh. Every access is
  wrapped - private windows and blocked site data throw on access, and the
  app must still render.
*/

export interface StoreShape {
  users: User[]
  destinations: Destination[]
  destinationCategories: DestinationCategory[]
  images: DestinationImage[]
  reviews: Review[]
  criteriaAssessments: DestinationCriterion[]
  verificationLogs: AdminVerificationLog[]
  endorsementLogs: EndorsementLog[]
  reports: Report[]
}

const STORAGE_KEY = 'sulyap.mock.v3'

function seed(): StoreShape {
  return {
    users: structuredClone(SEED_USERS),
    destinations: structuredClone(SEED_DESTINATIONS),
    destinationCategories: structuredClone(SEED_DESTINATION_CATEGORIES),
    images: structuredClone(SEED_IMAGES),
    reviews: structuredClone(SEED_REVIEWS),
    criteriaAssessments: structuredClone(SEED_CRITERIA_ASSESSMENTS),
    verificationLogs: structuredClone(SEED_VERIFICATION_LOGS),
    endorsementLogs: structuredClone(SEED_ENDORSEMENT_LOGS),
    reports: structuredClone(SEED_REPORTS),
  }
}

function load(): StoreShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoreShape
  } catch {
    // Private window, cleared site data, or storage blocked - fall through.
  }
  return seed()
}

export const db: StoreShape = load()

export function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Non-fatal: the in-memory store is still correct for this session.
  }
}

/** Wipe local changes and return to the seeded state. */
export function resetStore(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  Object.assign(db, seed())
}

/** Next id for a collection, so new rows never collide with seeded ones. */
export function nextId<T>(rows: T[], key: keyof T): number {
  return rows.reduce((max, row) => Math.max(max, Number(row[key]) || 0), 0) + 1
}

export const nowIso = (): string => new Date().toISOString()
