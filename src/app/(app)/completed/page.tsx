export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getCompletedTasks } from '@/lib/queries/tasks'
import TaskList from '@/components/todo/task-list'
import { getUser } from '@/lib/supabase/get-user'

export default async function CompletedPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const tasks = await getCompletedTasks(user.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Completed</h1>
      <TaskList initialTasks={tasks} mode="completed" />
    </div>
  )
}
