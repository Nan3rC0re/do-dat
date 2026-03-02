export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveTasks } from '@/lib/queries/tasks'
import TaskList from '@/components/todo/task-list'

export default async function InboxPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const tasks = await getActiveTasks(user.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
      <TaskList initialTasks={tasks} mode="inbox" />
    </div>
  )
}
