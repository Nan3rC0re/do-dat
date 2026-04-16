import { pgEnum, pgTable, text, timestamp, uuid, primaryKey } from 'drizzle-orm/pg-core'

export const taskStatusEnum = pgEnum('task_status', [
  'not_started',
  'in_progress',
  'completed',
])

export const taskPriorityEnum = pgEnum('task_priority', [
  'no_priority',
  'low',
  'medium',
  'high',
])

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Group = typeof groups.$inferSelect

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  status: taskStatusEnum('status').default('not_started').notNull(),
  priority: taskPriorityEnum('priority').default('no_priority').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  groupId: uuid('group_id').references(() => groups.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('slate'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const taskTags = pgTable('task_tags', {
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.taskId, t.tagId] }),
])

export type Task = typeof tasks.$inferSelect
export type TaskStatus = 'not_started' | 'in_progress' | 'completed'
export type TaskPriority = 'no_priority' | 'low' | 'medium' | 'high'
export type Tag = typeof tags.$inferSelect
export type TaskWithTags = Task & { tags: Tag[] }
