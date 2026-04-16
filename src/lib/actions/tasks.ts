'use server'

import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { tasks, taskTags, type TaskStatus, type TaskPriority } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

async function getAuthUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user.id
}

function revalidateAllTaskPaths() {
  revalidatePath('/')
  revalidatePath('/today')
  revalidatePath('/incoming')
  revalidatePath('/completed')
}

const createTaskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  dueDate: z.date().optional(),
  groupId: z.string().uuid().nullable().optional(),
  priority: z.enum(['no_priority', 'low', 'medium', 'high']).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
})

export async function createTask(input: {
  title: string
  dueDate?: Date
  id?: string
  groupId?: string | null
  priority?: TaskPriority
  tagIds?: string[]
}) {
  const userId = await getAuthUserId()
  const parsed = createTaskSchema.parse(input)

  const insertValues: typeof tasks.$inferInsert = {
    userId,
    title: parsed.title,
    dueDate: parsed.dueDate ?? null,
    groupId: parsed.groupId ?? null,
    priority: parsed.priority ?? 'no_priority',
  }
  if (parsed.id) insertValues.id = parsed.id

  const [task] = await db.insert(tasks).values(insertValues).returning()

  if (parsed.tagIds && parsed.tagIds.length > 0) {
    await db.insert(taskTags).values(
      parsed.tagIds.map((tagId) => ({ taskId: task.id, tagId })),
    )
  }

  revalidateAllTaskPaths()
  return task
}

const updateStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(['not_started', 'in_progress', 'completed']),
})

export async function updateTaskStatus(input: {
  taskId: string
  status: TaskStatus
}) {
  const userId = await getAuthUserId()
  const parsed = updateStatusSchema.parse(input)

  await db
    .update(tasks)
    .set({ status: parsed.status, updatedAt: new Date() })
    .where(and(eq(tasks.id, parsed.taskId), eq(tasks.userId, userId)))

  revalidateAllTaskPaths()
}

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1).max(500),
  dueDate: z.date().nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
  priority: z.enum(['no_priority', 'low', 'medium', 'high']).optional(),
})

export async function updateTask(input: {
  taskId: string
  title: string
  dueDate?: Date | null
  groupId?: string | null
  priority?: TaskPriority
}) {
  const userId = await getAuthUserId()
  const parsed = updateTaskSchema.parse(input)

  const setValues: Partial<typeof tasks.$inferInsert> = {
    title: parsed.title,
    dueDate: parsed.dueDate ?? null,
    groupId: parsed.groupId ?? null,
    updatedAt: new Date(),
  }
  if (parsed.priority !== undefined) setValues.priority = parsed.priority

  await db
    .update(tasks)
    .set(setValues)
    .where(and(eq(tasks.id, parsed.taskId), eq(tasks.userId, userId)))

  revalidateAllTaskPaths()
}

export async function deleteTask(input: { taskId: string }) {
  const userId = await getAuthUserId()
  z.string().uuid().parse(input.taskId)

  await db
    .delete(tasks)
    .where(and(eq(tasks.id, input.taskId), eq(tasks.userId, userId)))

  revalidateAllTaskPaths()
}
