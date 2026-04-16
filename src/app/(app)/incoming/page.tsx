export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getIncomingTasks } from '@/lib/queries/tasks'
import { getOrSeedGroups } from '@/lib/queries/groups'
import { getUserTags } from '@/lib/queries/tags'
import TaskList from '@/components/todo/task-list'
import { getUser } from '@/lib/supabase/get-user'

export default async function IncomingPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const [tasks, groups, userTags] = await Promise.all([
    getIncomingTasks(user.id),
    getOrSeedGroups(user.id),
    getUserTags(user.id),
  ])

  return <TaskList initialTasks={tasks} mode="incoming" title="Incoming" initialGroups={groups} initialTags={userTags} />
}
