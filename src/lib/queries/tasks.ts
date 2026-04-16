import 'server-only'

import { db } from '@/lib/db'
import { tasks, tags, taskTags } from '@/lib/db/schema'
import type { Task, Tag, TaskWithTags } from '@/lib/db/schema'
import { and, eq, ne, desc, gte, lte, asc, isNotNull, inArray } from 'drizzle-orm'
import { endOfDay, startOfDay, addDays } from 'date-fns'

async function attachTags(taskRows: Task[]): Promise<TaskWithTags[]> {
  if (taskRows.length === 0) return []

  const ids = taskRows.map((t) => t.id)
  const tagRows = await db
    .select({ taskId: taskTags.taskId, tag: tags })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(inArray(taskTags.taskId, ids))

  const tagMap = new Map<string, Tag[]>()
  for (const row of tagRows) {
    const list = tagMap.get(row.taskId) ?? []
    list.push(row.tag)
    tagMap.set(row.taskId, list)
  }

  return taskRows.map((t) => ({ ...t, tags: tagMap.get(t.id) ?? [] }))
}

export async function getActiveTasks(userId: string): Promise<TaskWithTags[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), ne(tasks.status, 'completed')))
    .orderBy(desc(tasks.createdAt))
  return attachTags(rows)
}

export async function getCompletedTasks(userId: string): Promise<TaskWithTags[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, 'completed')))
    .orderBy(desc(tasks.updatedAt))
  return attachTags(rows)
}

export async function getTodayTasks(userId: string, start?: Date, end?: Date): Promise<TaskWithTags[]> {
  const now = new Date()
  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        ne(tasks.status, 'completed'),
        isNotNull(tasks.dueDate),
        lte(tasks.dueDate, end ?? endOfDay(now)),
      ),
    )
    .orderBy(asc(tasks.dueDate))
  return attachTags(rows)
}

export async function getIncomingTasks(userId: string): Promise<TaskWithTags[]> {
  const tomorrow = startOfDay(addDays(new Date(), 1))
  const rows = await db
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
  return attachTags(rows)
}
