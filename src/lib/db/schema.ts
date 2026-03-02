import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const taskStatusEnum = pgEnum('task_status', [
  'not_started',
  'in_progress',
  'completed',
])

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  status: taskStatusEnum('status').default('not_started').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Task = typeof tasks.$inferSelect
export type TaskStatus = 'not_started' | 'in_progress' | 'completed'
