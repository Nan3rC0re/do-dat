import 'server-only'

import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import type { Task } from '@/lib/db/schema'
import { and, eq, ne, desc, gte, lte, asc, isNotNull } from 'drizzle-orm'
import { startOfDay, endOfDay, addDays } from 'date-fns'

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

export async function getTodayTasks(userId: string, start?: Date, end?: Date): Promise<Task[]> {
  const now = new Date()
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        ne(tasks.status, 'completed'),
        isNotNull(tasks.dueDate),
        gte(tasks.dueDate, start ?? startOfDay(now)),
        lte(tasks.dueDate, end ?? endOfDay(now)),
      ),
    )
    .orderBy(asc(tasks.dueDate))
}

export async function getIncomingTasks(userId: string): Promise<Task[]> {
  const tomorrow = startOfDay(addDays(new Date(), 1))
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        ne(tasks.status, 'completed'),
        isNotNull(tasks.dueDate),
        gte(tasks.dueDate, tomorrow),
      ),
    )
    .orderBy(asc(tasks.dueDate))
}
