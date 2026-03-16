export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getIncomingTasks } from '@/lib/queries/tasks'
import { getOrSeedGroups } from '@/lib/queries/groups'
import TaskList from '@/components/todo/task-list'
import { getUser } from '@/lib/supabase/get-user'

export default async function IncomingPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const [tasks, groups] = await Promise.all([
    getIncomingTasks(user.id),
    getOrSeedGroups(user.id),
  ])

  return <TaskList initialTasks={tasks} mode="incoming" title="Incoming" initialGroups={groups} />
}
