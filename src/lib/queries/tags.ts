import 'server-only'

import { db } from '@/lib/db'
import { tags } from '@/lib/db/schema'
import type { Tag } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function getUserTags(userId: string): Promise<Tag[]> {
  return db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.createdAt))
}
