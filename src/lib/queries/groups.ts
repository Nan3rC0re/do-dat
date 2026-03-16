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
