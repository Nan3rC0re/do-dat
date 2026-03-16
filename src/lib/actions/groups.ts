'use server'

import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { groups } from '@/lib/db/schema'
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

function revalidateAll() {
  revalidatePath('/')
  revalidatePath('/today')
  revalidatePath('/incoming')
  revalidatePath('/completed')
}

export async function createGroup(input: { name: string }) {
  const userId = await getAuthUserId()
  const name = z.string().min(1).max(100).parse(input.name)
  const [group] = await db.insert(groups).values({ userId, name }).returning()
  revalidateAll()
  return group
}

export async function deleteGroup(input: { groupId: string }) {
  const userId = await getAuthUserId()
  z.string().uuid().parse(input.groupId)
  await db
    .delete(groups)
    .where(and(eq(groups.id, input.groupId), eq(groups.userId, userId)))
  revalidateAll()
}
