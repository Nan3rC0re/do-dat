'use server'

import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { tags, taskTags, tasks } from '@/lib/db/schema'
import type { Tag } from '@/lib/db/schema'
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

const TAG_COLORS = [
  'slate', 'red', 'orange', 'amber', 'lime', 'emerald',
  'teal', 'sky', 'blue', 'violet', 'purple', 'pink',
]

export async function createTag(input: { name: string; color?: string }): Promise<Tag> {
  const userId = await getAuthUserId()
  const name = z.string().min(1).max(100).parse(input.name.trim())

  let color = input.color
  if (!color) {
    const existing = await db.select().from(tags).where(eq(tags.userId, userId))
    color = TAG_COLORS[existing.length % TAG_COLORS.length]
  }

  const [tag] = await db.insert(tags).values({ userId, name, color }).returning()
  revalidateAllTaskPaths()
  return tag
}

export async function setTaskTags(input: { taskId: string; tagIds: string[] }) {
  const userId = await getAuthUserId()
  z.string().uuid().parse(input.taskId)

  // Verify task ownership
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, input.taskId), eq(tasks.userId, userId)))
  if (!task) throw new Error('Unauthorized')

  // Replace strategy: delete existing then insert new
  await db.delete(taskTags).where(eq(taskTags.taskId, input.taskId))
  if (input.tagIds.length > 0) {
    await db.insert(taskTags).values(
      input.tagIds.map((tagId) => ({ taskId: input.taskId, tagId })),
    )
  }

  revalidateAllTaskPaths()
}

export async function deleteTag(input: { tagId: string }) {
  const userId = await getAuthUserId()
  z.string().uuid().parse(input.tagId)

  // task_tags rows cascade-delete automatically via FK ON DELETE CASCADE
  await db.delete(tags).where(and(eq(tags.id, input.tagId), eq(tags.userId, userId)))
  revalidateAllTaskPaths()
}
