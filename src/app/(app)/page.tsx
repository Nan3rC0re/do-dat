export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getActiveTasks } from '@/lib/queries/tasks'
import TaskList from '@/components/todo/task-list'
import { getUser } from '@/lib/supabase/get-user'

export default async function InboxPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const tasks = await getActiveTasks(user.id)

  return <TaskList initialTasks={tasks} mode="inbox" title="Inbox" />
}
