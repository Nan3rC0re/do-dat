export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getIncomingTasks } from '@/lib/queries/tasks'
import TaskList from '@/components/todo/task-list'
import { getUser } from '@/lib/supabase/get-user'

export default async function IncomingPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const tasks = await getIncomingTasks(user.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Incoming</h1>
      <TaskList initialTasks={tasks} mode="incoming" />
    </div>
  )
}
