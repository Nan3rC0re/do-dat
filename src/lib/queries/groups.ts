import 'server-only'

import { db } from '@/lib/db'
import { groups } from '@/lib/db/schema'
import type { Group } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function getGroups(userId: string): Promise<Group[]> {
  return db
    .select()
    .from(groups)
    .where(eq(groups.userId, userId))
    .orderBy(asc(groups.createdAt))
}

// Returns groups for the user, seeding a default "Groceries" group for new users
export async function getOrSeedGroups(userId: string): Promise<Group[]> {
  const existing = await getGroups(userId)
  if (existing.length > 0) return existing
  const [groceries] = await db
    .insert(groups)
    .values({ userId, name: 'Groceries' })
    .returning()
  return [groceries]
}
