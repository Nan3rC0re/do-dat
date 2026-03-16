export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getTodayTasks } from '@/lib/queries/tasks'
import { getOrSeedGroups } from '@/lib/queries/groups'
import TaskList from '@/components/todo/task-list'
import TodayDateSync from '@/components/todo/today-date-sync'
import { getUser } from '@/lib/supabase/get-user'
import { format, parseISO } from 'date-fns'

export default async function TodayPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  // Read client-provided date boundaries from cookies (set by TodayDateSync)
  const cookieStore = await cookies()
  const dateStr = cookieStore.get('today-date')?.value
  const startStr = cookieStore.get('today-start')?.value
  const endStr = cookieStore.get('today-end')?.value

  const startDate = startStr ? new Date(decodeURIComponent(startStr)) : undefined
  const endDate = endStr ? new Date(decodeURIComponent(endStr)) : undefined

  const [tasks, groups] = await Promise.all([
    getTodayTasks(user.id, startDate, endDate),
    getOrSeedGroups(user.id),
  ])

  // Use client-provided date string for the label — avoids server UTC mismatch
  const todayLabel = dateStr
    ? format(parseISO(dateStr), 'EEE MMM d, yyyy')
    : format(new Date(), 'EEE MMM d, yyyy')

  return (
    <>
      <TodayDateSync />
      <TaskList
        initialTasks={tasks}
        mode="today"
        title={todayLabel}
        defaultDate={startDate ?? new Date()}
        initialGroups={groups}
      />
    </>
  )
}
