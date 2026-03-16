export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getTodayTasks } from '@/lib/queries/tasks'
import { getGroups } from '@/lib/queries/groups'
import TaskList from '@/components/todo/task-list'
import TodayDateSync from '@/components/todo/today-date-sync'
import { getUser } from '@/lib/supabase/get-user'
import { format, parseISO } from 'date-fns'

interface TodayPageProps {
  searchParams: Promise<{ date?: string; start?: string; end?: string }>
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const user = await getUser()
  if (!user) redirect('/login')

  const { date, start, end } = await searchParams

  const startDate = start ? new Date(start) : undefined
  const endDate = end ? new Date(end) : undefined

  const [tasks, groups] = await Promise.all([
    getTodayTasks(user.id, startDate, endDate),
    getGroups(user.id),
  ])

  // Use client-provided date string for the label (avoids server UTC mismatch)
  const todayLabel = date
    ? format(parseISO(date), 'EEE MMM d, yyyy')
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
