'use server'

import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { tasks, type TaskStatus } from '@/lib/db/schema'
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
})

export async function createTask(input: {
  title: string
  dueDate?: Date
  id?: string
  groupId?: string | null
}) {
  const userId = await getAuthUserId()
  const parsed = createTaskSchema.parse(input)

  const insertValues: typeof tasks.$inferInsert = {
    userId,
    title: parsed.title,
    dueDate: parsed.dueDate ?? null,
    groupId: parsed.groupId ?? null,
  }
  if (parsed.id) insertValues.id = parsed.id

  const [task] = await db.insert(tasks).values(insertValues).returning()

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
})

export async function updateTask(input: {
  taskId: string
  title: string
  dueDate?: Date | null
}) {
  const userId = await getAuthUserId()
  const parsed = updateTaskSchema.parse(input)

  const setValues: Partial<typeof tasks.$inferInsert> = {
    title: parsed.title,
    dueDate: parsed.dueDate ?? null,
    updatedAt: new Date(),
  }

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
