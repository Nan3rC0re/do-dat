import 'server-only'

import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import type { Task } from '@/lib/db/schema'
import { and, eq, ne, desc } from 'drizzle-orm'

export async function getActiveTasks(userId: string): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), ne(tasks.status, 'completed')))
    .orderBy(desc(tasks.createdAt))
}

export async function getCompletedTasks(userId: string): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, 'completed')))
    .orderBy(desc(tasks.updatedAt))
}
