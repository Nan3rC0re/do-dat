export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getTodayTasks } from '@/lib/queries/tasks'
import TaskList from '@/components/todo/task-list'
import { getUser } from '@/lib/supabase/get-user'
import { format } from 'date-fns'

export default async function TodayPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const tasks = await getTodayTasks(user.id)
  const todayLabel = format(new Date(), 'EEE MMM d, yyyy')

  return <TaskList initialTasks={tasks} mode="today" title={todayLabel} defaultDate={new Date()} />
}
