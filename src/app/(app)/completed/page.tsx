export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getCompletedTasks } from '@/lib/queries/tasks'
import { getGroups } from '@/lib/queries/groups'
import { getUserTags } from '@/lib/queries/tags'
import TaskList from '@/components/todo/task-list'
import { getUser } from '@/lib/supabase/get-user'

export default async function CompletedPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const [tasks, groups, userTags] = await Promise.all([
    getCompletedTasks(user.id),
    getGroups(user.id),
    getUserTags(user.id),
  ])

  return <TaskList initialTasks={tasks} mode="completed" title="Completed" initialGroups={groups} initialTags={userTags} />
}
