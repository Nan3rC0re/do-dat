# Todo App — Architecture & Engineering Plan

> Stack: Next.js 15 (App Router) · Supabase Auth · Drizzle ORM · Tailwind CSS · shadcn/ui · Vercel  
> Priority order: Performance → Clean code → Learning new patterns → Speed to ship

---

## 1. Why This Stack Wins (Opportunity Cost Analysis)

### Next.js 15 App Router — Keep It
The App Router is now the **undisputed production standard** for React in 2025. React Server Components (RSC) and Server Actions let you eliminate entire API layers. For a todo app, this means:
- Tasks load server-side with zero client JS for the data-fetching layer
- Status mutations happen via Server Actions — no `/api/todos` route needed
- Bundle size stays tiny because list rendering never ships to the browser

**Verdict: No swap needed. Nothing comes close for this use case.**

---

### Supabase Auth — Keep It (with caveats)
Supabase Auth handles email/password well and integrates cleanly with Next.js via `@supabase/ssr`. The key 2025 pattern is using the **SSR package** (not the legacy `auth-helpers` package) to manage cookies properly across Server Components, Server Actions, and Middleware.

One important note from recent security research: a 2025 CVE (CVE-2025-29927) proved that **middleware alone is not sufficient for auth**. The correct pattern is:
- Middleware: refresh the session token + redirect unauthenticated users (thin, fast)
- Every Server Action: re-verify the session independently before any DB write

**Verdict: Supabase Auth is the right call. Just implement defense-in-depth.**

---

### Drizzle ORM — Keep It (use it correctly)
Drizzle is the right ORM for this stack. Key reasons:
- Schema-as-source-of-truth generates TypeScript types used everywhere (DB → server → client)
- `drizzle-zod` generates Zod validators directly from your schema — no double-typing
- SQL-like API means zero magic; queries are readable and predictable
- Only runs server-side (Server Components + Server Actions) — never touches the client bundle

**Critical setup detail:** Use Supabase's **Connection Pooler** (Transaction mode, port 6543) for the `DATABASE_URL`, not the direct connection. Vercel's serverless functions open/close connections on every request; pooling prevents connection exhaustion.

**Verdict: Keep Drizzle. Skip Prisma — too heavy. Skip raw `pg` — lose type safety.**

---

### shadcn/ui + Tailwind — Keep It
shadcn/ui is "copy-paste components you own", not a dependency. This means:
- Zero lock-in, full customization
- Components are accessible out of the box (Radix UI primitives)
- Tailwind keeps specificity flat and co-located

**Verdict: Ideal for a focused app. No swap justified.**

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│  Client Components (islands of interactivity)       │
│  - useOptimistic for instant status changes         │
│  - useActionState for form pending states           │
│  - shadcn/ui for all interactive UI elements        │
└───────────────────┬─────────────────────────────────┘
                    │ Server Actions (secure RPC)
┌───────────────────▼─────────────────────────────────┐
│                 Next.js Server                      │
│  Server Components: render task lists from DB       │
│  Server Actions: create / update / delete tasks     │
│  Middleware: session refresh + auth redirect        │
│  Zod: validate all action inputs                    │
└───────────────────┬─────────────────────────────────┘
                    │ Connection Pooler
┌───────────────────▼─────────────────────────────────┐
│                  Supabase                           │
│  Auth: email/password sessions via cookies          │
│  Postgres: tasks table with RLS policies            │
│  Drizzle ORM: type-safe queries                     │
└─────────────────────────────────────────────────────┘
```

**The guiding principle:** Server is the default surface. Client components are small, event-driven islands. Only interactivity crosses the boundary — data stays on the server.

---

## 3. Folder Structure

```
src/
├── app/
│   ├── (auth)/                    # Route group — no layout inheritance
│   │   ├── login/
│   │   │   └── page.tsx           # Server Component (redirects if authed)
│   │   └── layout.tsx             # Centered card layout
│   ├── (app)/                     # Route group — authenticated routes
│   │   ├── layout.tsx             # Checks session, renders nav
│   │   ├── page.tsx               # Active tasks (Server Component)
│   │   └── completed/
│   │       └── page.tsx           # Completed tasks view
│   ├── layout.tsx                 # Root layout: fonts, providers
│   └── globals.css
│
├── components/
│   ├── ui/                        # shadcn/ui components (auto-generated)
│   ├── todo/
│   │   ├── task-list.tsx          # Client Component — useOptimistic
│   │   ├── task-item.tsx          # Client Component — status toggle
│   │   ├── add-task-form.tsx      # Client Component — add task
│   │   └── task-filters.tsx       # Client Component — filter/sort UI
│   └── auth/
│       ├── login-form.tsx         # Client Component — useActionState
│       └── logout-button.tsx      # Client Component
│
├── lib/
│   ├── db/
│   │   ├── index.ts               # Drizzle client (server-only)
│   │   └── schema.ts              # Single source of truth
│   ├── actions/
│   │   ├── auth.ts                # login, logout Server Actions
│   │   └── tasks.ts               # CRUD Server Actions
│   ├── queries/
│   │   └── tasks.ts               # Read-only Drizzle queries
│   └── supabase/
│       ├── client.ts              # Browser Supabase client
│       ├── server.ts              # Server Supabase client (cookies)
│       └── middleware.ts          # Session refresh helper
│
├── middleware.ts                  # Auth redirect + session refresh
└── drizzle.config.ts
```

---

## 4. Data Model

```typescript
// lib/db/schema.ts
import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const taskStatusEnum = pgEnum('task_status', ['not_started', 'in_progress', 'completed'])

export const tasks = pgTable('tasks', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull(),             // Supabase auth.users FK
  title:     text('title').notNull(),
  status:    taskStatusEnum('status').default('todo').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Infer types — used everywhere, no manual interfaces needed
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type TaskStatus = typeof taskStatusEnum.enumValues[number]
```

**Supabase RLS policy (apply in Supabase dashboard):**
```sql
-- Users can only see and modify their own tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_own" ON tasks
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## 5. Server Actions Pattern

All mutations follow this security pattern — authenticate first, validate second, mutate third.

```typescript
// lib/actions/tasks.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { tasks, TaskStatus } from '@/lib/db/schema'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'

const updateStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(['not_started', 'in_progress', 'completed']),
})

export async function updateTaskStatus(input: z.infer<typeof updateStatusSchema>) {
  // 1. Auth check — never skip this
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 2. Input validation
  const { taskId, status } = updateStatusSchema.parse(input)

  // 3. Mutate — RLS provides a second layer of protection
  await db.update(tasks)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))

  revalidatePath('/')
}
```

---

## 6. Optimistic UI with `useOptimistic`

This is the performance centerpiece. Status changes feel instant — no loading spinners for the happy path.

```typescript
// components/todo/task-list.tsx
'use client'

import { useOptimistic, startTransition } from 'react'
import { updateTaskStatus } from '@/lib/actions/tasks'
import type { Task, TaskStatus } from '@/lib/db/schema'

type OptimisticAction =
  | { type: 'update_status'; taskId: string; status: TaskStatus }

function taskReducer(state: Task[], action: OptimisticAction): Task[] {
  if (action.type === 'update_status') {
    return state.map(t =>
      t.id === action.taskId ? { ...t, status: action.status } : t
    )
  }
  return state
}

export function TaskList({ initialTasks }: { initialTasks: Task[] }) {
  const [optimisticTasks, dispatch] = useOptimistic(initialTasks, taskReducer)

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    startTransition(async () => {
      dispatch({ type: 'update_status', taskId, status })  // instant
      await updateTaskStatus({ taskId, status })            // background
    })
  }

  return (
    <ul>
      {optimisticTasks.map(task => (
        <TaskItem key={task.id} task={task} onStatusChange={handleStatusChange} />
      ))}
    </ul>
  )
}
```

**Why a reducer pattern instead of a simple updater?** Because this app has multiple mutation types (add, update status, delete). A reducer handles all of them from a single `useOptimistic` hook cleanly.

---

## 7. Authentication Flow

```
User visits /            →  Middleware checks session
                             ↓ No session → redirect to /login
                             ↓ Session valid → allow through

/login form submits      →  Server Action: supabase.auth.signInWithPassword()
                             ↓ Error → return error to form via useActionState
                             ↓ Success → redirect to /

Server Actions           →  Always call supabase.auth.getUser() at top
                             This hits Supabase's auth server, not just the cookie
                             (defense-in-depth against the 2025 CVE)
```

**The `useActionState` pattern for login forms:**
```typescript
// components/auth/login-form.tsx
'use client'
import { useActionState } from 'react'
import { loginAction } from '@/lib/actions/auth'

const initialState = { error: null }

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, initialState)

  return (
    <form action={action}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {state.error && <p className="text-destructive">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
```

---

## 8. Performance Architecture Decisions

| Decision | Choice | Why |
|---|---|---|
| Rendering strategy | Server Components by default | Zero client JS for list rendering |
| Mutations | Server Actions | No API routes; RPC-style, secure, colocated |
| Optimistic updates | `useOptimistic` + reducer | Instant UI, auto-rollback on error |
| Form states | `useActionState` | Built-in pending/error, no extra state vars |
| DB connection | Connection Pooler (port 6543) | Serverless-safe, prevents exhaustion |
| Caching | `revalidatePath` after mutations | Targeted; no stale data on the server |
| Auth in actions | `auth.getUser()` every time | CVE-safe; doesn't trust middleware alone |
| Client JS boundary | Only interactive components | Smallest possible bundle |

---

## 9. Key Packages (Final)

```json
{
  "dependencies": {
    "next": "^15.x",
    "react": "^19.x",
    "@supabase/supabase-js": "^2.x",
    "@supabase/ssr": "^0.x",
    "drizzle-orm": "^0.x",
    "postgres": "^3.x",
    "drizzle-zod": "^0.x",
    "zod": "^3.x",
    "tailwindcss": "^3.x",
    "class-variance-authority": "^0.x",
    "clsx": "^2.x"
  },
  "devDependencies": {
    "drizzle-kit": "^0.x",
    "typescript": "^5.x"
  }
}
```

**shadcn/ui components to install:** `button`, `input`, `checkbox`, `badge`, `card`, `toast` (or `sonner` for toasts — lighter weight)

---

## 10. Working with Claude Effectively (Tips for This Project)

### Use SKILL.md files
Claude has pre-built skill files for creating `.docx`, `.pptx`, `.xlsx`, and `.pdf` outputs. When you ask Claude to create a document it will automatically read these before writing any code. You don't need to do anything — just ask for the file type and Claude reads the instructions automatically.

### Prompt patterns that work well

**For architecture decisions:**
> "Given my stack (Next.js 15, Supabase, Drizzle, Tailwind/shadcn), what is the most performant way to implement [X]? Walk me through the tradeoffs."

**For code generation:**
> "Write the Server Action for [task]. It should: authenticate the user, validate input with Zod, use Drizzle to [operation], and revalidate the correct path. Follow the pattern from our planning doc."

**For debugging:**
> "Here is the error and the relevant file. Don't rewrite the file — tell me the minimal change needed and why."

**For component work:**
> "Create a TaskItem client component. It receives a `Task` type from our schema. The status toggle should call `onStatusChange` prop — not the Server Action directly. Keep the component under 60 lines."

### Keep context alive
Paste the schema (`lib/db/schema.ts`) and the action signatures into your message when asking Claude to write components. Claude works best when it can see the exact types and doesn't need to guess.

### File-by-file is better than all-at-once
Ask Claude to generate one file at a time — schema → actions → server queries → client components. This catches integration errors early instead of at the end.

---

## 11. Implementation Order

Work in this sequence. Each step is independently testable.

1. **Scaffold** — `create-next-app`, configure Tailwind, install shadcn/ui base
2. **DB schema** — `lib/db/schema.ts`, run `drizzle-kit push`, verify in Supabase
3. **Auth** — Supabase client/server helpers, middleware, login Server Action, login page
4. **Queries** — `lib/queries/tasks.ts` — fetch active and completed tasks
5. **Server Actions** — `lib/actions/tasks.ts` — create, update status, delete
6. **Server pages** — `app/(app)/page.tsx` and `completed/page.tsx` — pass data down
7. **Client components** — TaskList with `useOptimistic`, AddTaskForm with `useActionState`
8. **Polish** — error boundaries, loading states, toast notifications, empty states
9. **Deploy** — Vercel + Supabase integration (auto-injects env vars)

---

## 12. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Use Transaction mode pooler URL (port 6543) for Drizzle
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-xxx.pooler.supabase.com:6543/postgres
```

---

## 13. Claude as a Design Partner — Using Figma Reference Images

Claude has vision capabilities and can read images directly. This changes how you collaborate during the build phase in a meaningful way.

### How to use the `/reference` folder
Place your exported Figma frames into `/reference` (e.g., `/reference/task-list.png`, `/reference/completed-view.png`, `/reference/empty-state.png`). When prompting Claude to build a component, attach the relevant image. Claude will read the visual design and match it — spacing, colors, font weights, border radii, states.

**Effective prompts with reference images:**

> "Here is `/reference/task-item.png`. Build the `TaskItem` client component to match this design exactly. Use our `Task` type from `lib/db/schema.ts`. The three status states (not_started, in_progress, completed) should map to the three visual variants shown."

> "Here is `/reference/empty-state.png`. Create the empty state component for the active tasks view. Use motion.dev for the entrance animation — the illustration should fade up on mount."

> "Compare `/reference/login-desktop.png` and `/reference/login-mobile.png`. Build the login form to be responsive between these two layouts."

### What Claude can extract from Figma exports
- Exact color hex values from the design
- Spacing rhythm (4px/8px grid compliance)
- Component hierarchy (which wrapper is which component)
- Interactive state differences (default vs hover vs active vs disabled)
- Typography scale

### Naming convention for reference files
```
/reference/
├── login.png               # Auth screen
├── task-list-active.png    # Main view — active tasks
├── task-list-completed.png # Completed view
├── task-item-default.png   # Task item — not started state
├── task-item-progress.png  # Task item — in progress state
├── task-item-done.png      # Task item — completed state
├── empty-state.png         # Empty tasks view
├── add-task-form.png       # Add task input area
└── mobile-nav.png          # Mobile nav / bottom bar if applicable
```

---

## 14. Making It Feel Premium — Motion Design with motion.dev

### Install
```bash
npm install motion
```

Import from `motion/react` (not the legacy `framer-motion` package — it's been rebranded):
```typescript
import { motion, AnimatePresence } from 'motion/react'
```

---

### The Apple Design Philosophy (applied to web)

Apple's HIG is built on four pillars that translate directly to web micro-interactions:

| Apple Principle | Web Translation |
|---|---|
| **Clarity** | Animations communicate state, they don't decorate |
| **Deference** | Motion serves content — never steals focus |
| **Depth** | Spring physics > linear easing. Things feel physical |
| **Consistency** | Same spring config used everywhere — the app has a single "feel" |

**The golden rule from Apple's motion design:** Flashy is out. Physics is in. Animations should feel like they *had* to happen — not like they were added on top.

---

### Spring Configuration — Your App's "Feel"

Define one shared spring config used everywhere. This is what makes Linear and Notion feel cohesive rather than chaotic:

```typescript
// lib/motion.ts — single source of truth for all spring configs
export const springs = {
  // Snappy: button presses, checkbox toggles
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
  
  // Smooth: item entrance, status badge changes
  smooth: { type: 'spring', stiffness: 300, damping: 25 },
  
  // Bouncy: task completion celebration, empty state entrance
  bouncy: { type: 'spring', stiffness: 500, damping: 20, mass: 0.8 },
  
  // Gentle: page transitions, list reorder
  gentle: { type: 'spring', stiffness: 200, damping: 30 },
} as const
```

---

### Micro-Interaction Catalogue for This App

#### 1. Task Completion — The Most Important Animation
When a user marks a task as `completed`, this is the highest-value moment. It should feel satisfying, like the iOS checkbox in Reminders.

```typescript
// The status badge changes color with a scale pulse
<motion.div
  key={task.status}
  initial={{ scale: 0.85, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={springs.bouncy}
>
  <StatusBadge status={task.status} />
</motion.div>

// The task title gets a strikethrough that animates in (left to right)
<motion.span
  animate={{
    color: status === 'completed' ? 'var(--muted-foreground)' : 'var(--foreground)',
    textDecoration: status === 'completed' ? 'line-through' : 'none',
  }}
  transition={springs.smooth}
>
  {task.title}
</motion.span>
```

#### 2. Task Enter / Exit — AnimatePresence
Tasks added to the list should slide in from the top. Deleted tasks should collapse away, not just disappear. This is the pattern Linear uses for issue rows.

```typescript
<AnimatePresence mode="popLayout">
  {tasks.map(task => (
    <motion.li
      key={task.id}
      layout                                     // animates position changes (reorder)
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.97 }}
      transition={springs.smooth}
    >
      <TaskItem task={task} />
    </motion.li>
  ))}
</AnimatePresence>
```

> `mode="popLayout"` is the key detail — it lets remaining items animate into their new positions when one exits, exactly like iOS list animations.

#### 3. Button Press — whileTap
Every interactive element should acknowledge the press immediately. This is the web equivalent of iOS haptic feedback.

```typescript
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.96 }}
  transition={springs.snappy}
>
  Add Task
</motion.button>
```

#### 4. Status Cycle Button — The Core Interaction
The status toggle (not_started → in_progress → completed) should feel like clicking through a physical dial:

```typescript
const STATUS_CYCLE = ['not_started', 'in_progress', 'completed'] as const

export function StatusToggle({ status, onCycle }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.9, rotate: 15 }}   // slight rotate on tap = satisfying
      transition={springs.snappy}
      onClick={onCycle}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={status}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.12 }}
        >
          <StatusIcon status={status} />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
```

#### 5. Add Task Form — Expand on Focus
When the user clicks "Add Task", the input area should expand smoothly from nothing:

```typescript
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={springs.smooth}
      style={{ overflow: 'hidden' }}
    >
      <AddTaskForm />
    </motion.div>
  )}
</AnimatePresence>
```

#### 6. Empty State — Delightful Entrance
When there are no tasks, the empty state illustration should float gently:

```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ ...springs.gentle, delay: 0.1 }}
>
  <EmptyIllustration />
  <motion.p
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.25 }}
  >
    All clear. Add something to get started.
  </motion.p>
</motion.div>
```

#### 7. Layout Animation — Smooth Reorder
When a task changes status and moves between sections (active → completed), use `layout` prop so it physically travels to its new position. This is what separates Linear from Jira in terms of feel.

```typescript
// Wrap every list in a LayoutGroup so reorders animate across sections
import { LayoutGroup } from 'motion/react'

<LayoutGroup>
  <ActiveTaskList />
  <CompletedTaskList />
</LayoutGroup>
```

---

### Real-World References: What Makes These Apps Feel Premium

| App | Key Micro-Interaction | Why It Works |
|---|---|---|
| **Linear** | Issue status icon cycles with a quick scale + color transition | State is communicated without a loading state — instant feedback |
| **Linear** | Sidebar items lift slightly on hover with a subtle background fill | Distinguishes clickable from static without color noise |
| **Notion** | Block drag handles fade in on hover only | Reduces visual clutter; UI recedes until needed |
| **Notion** | Page icon changes with a scale pop | High reward for small action — makes the app feel alive |
| **Superhuman** | Every keyboard shortcut triggers an instant response with subtle visual echo | Keyboard feels as physical as a real device |
| **Telegram** | Message sent animation uses a spring — bubble slides in, checkmark draws itself | The send action feels completed, not just submitted |
| **Tinder** | Card swipe has momentum and snap physics | Drag follows the finger perfectly, then decisively snaps |
| **Things 3 (iOS)** | Task completion draws a check, then the row fades and collapses | Sequential animation tells a story: done → acknowledged → gone |

**The through-line in all of them:** The animation is a *response* to the user's intent, not a decoration. It happens at the exact moment of interaction and resolves quickly (under 300ms for most states). Nothing lingers.

---

### `prefers-reduced-motion` — Non-Negotiable
Always respect this system setting. Users with vestibular disorders can experience nausea from motion:

```typescript
// hooks/use-reduced-motion.ts
import { useReducedMotion } from 'motion/react'

export function useSafeMotion() {
  const prefersReducedMotion = useReducedMotion()
  return {
    // If reduced motion: snap instantly instead of springing
    transition: prefersReducedMotion ? { duration: 0 } : springs.smooth,
    // Turn off non-essential animations entirely
    shouldAnimate: !prefersReducedMotion,
  }
}
```

---

## 15. Sound Design — Making Interactions Delightful

Sound in a productivity app should work like ambient sound design in Apple's apps — you notice its absence more than its presence. It's confirmation, not decoration.

### Library: Use Native Web Audio API (no dependencies)
For simple UI sounds, the Web Audio API can synthesize tones programmatically — no audio files to load, no extra dependencies, zero bundle impact. Howler.js is the right choice only if you have audio files to play (custom sounds you've recorded/designed).

```typescript
// lib/sound.ts — synthesized UI sounds via Web Audio API
type SoundType = 'complete' | 'add' | 'cycle' | 'delete'

const audioContext = typeof window !== 'undefined'
  ? new (window.AudioContext || (window as any).webkitAudioContext)()
  : null

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  if (!audioContext || audioContext.state === 'suspended') return

  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)

  // Soft attack and release (no clicks)
  gainNode.gain.setValueAtTime(0, audioContext.currentTime)
  gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration)
}

export const sounds = {
  // Task completed — two-tone ascending chime (satisfying, like iOS)
  complete: () => {
    playTone(523.25, 0.15, 'sine', 0.12)          // C5
    setTimeout(() => playTone(783.99, 0.2, 'sine', 0.1), 80)  // G5
  },

  // Task added — single soft pop
  add: () => playTone(440, 0.1, 'sine', 0.08),    // A4

  // Status cycled — quick tick (like a mechanical button)
  cycle: () => playTone(800, 0.05, 'square', 0.04),

  // Task deleted — soft descending note
  delete: () => {
    playTone(392, 0.1, 'sine', 0.08)              // G4
    setTimeout(() => playTone(330, 0.15, 'sine', 0.05), 60)   // E4
  },
}

// Resume AudioContext on first user gesture (browser autoplay policy)
export function unlockAudio() {
  audioContext?.resume()
}
```

### Sound Hook with User Preference
Always give users the ability to turn sound off. Store the preference in `localStorage`:

```typescript
// hooks/use-sound.ts
'use client'
import { useCallback } from 'react'
import { sounds, unlockAudio } from '@/lib/sound'

export function useTaskSounds() {
  const isSoundEnabled = () => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sound-enabled') !== 'false'
  }

  const play = useCallback((sound: keyof typeof sounds) => {
    if (!isSoundEnabled()) return
    unlockAudio()
    sounds[sound]()
  }, [])

  return { play }
}
```

### Sound Map — What Plays When

| Interaction | Sound | Design Intent |
|---|---|---|
| Task added | Soft single tone (A4, 100ms) | "Acknowledged" — quiet, not celebratory |
| Status → In Progress | Quick tick (800Hz, 50ms) | Physical button click feel |
| Status → Completed | Two-tone ascending chime | Reward + closure — the most satisfying moment |
| Task deleted | Soft descending two-note | Gentle "gone" — not alarming |
| Login success | Three ascending tones | Welcome — warm and inviting |

### Using Howler.js Instead (for custom audio files)
If you want to use real audio files (designed sounds from a sound library like Mixkit, Zapsplat, or your own):

```bash
npm install howler
npm install --save-dev @types/howler
```

```typescript
// lib/sound.ts (with howler)
import { Howl } from 'howler'

// Audio sprite — all sounds in one file, loaded once
const sfx = new Howl({
  src: ['/audio/ui-sounds.webm', '/audio/ui-sounds.mp3'],
  sprite: {
    complete: [0, 400],      // ms offset, duration
    add:      [500, 150],
    cycle:    [700, 80],
    delete:   [850, 300],
  },
  volume: 0.4,
})

export const sounds = {
  complete: () => sfx.play('complete'),
  add:      () => sfx.play('add'),
  cycle:    () => sfx.play('cycle'),
  delete:   () => sfx.play('delete'),
}
```

**Good sources for UI sounds:** Mixkit (free), Zapsplat (free with attribution), Apple's HIG sound library (iOS system sounds — reference for tonality and feel).

### Sound Settings Toggle Component

```typescript
// components/settings/sound-toggle.tsx
'use client'
import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { motion } from 'motion/react'

export function SoundToggle() {
  const [enabled, setEnabled] = useState(
    () => typeof window !== 'undefined'
      ? localStorage.getItem('sound-enabled') !== 'false'
      : true
  )

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    localStorage.setItem('sound-enabled', String(next))
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      className="text-muted-foreground hover:text-foreground transition-colors"
      title={enabled ? 'Mute sounds' : 'Enable sounds'}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={enabled ? 'on' : 'off'}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
```

---

## 16. Updated Package List

```json
{
  "dependencies": {
    "next": "^15.x",
    "react": "^19.x",
    "@supabase/supabase-js": "^2.x",
    "@supabase/ssr": "^0.x",
    "drizzle-orm": "^0.x",
    "postgres": "^3.x",
    "drizzle-zod": "^0.x",
    "zod": "^3.x",
    "tailwindcss": "^3.x",
    "class-variance-authority": "^0.x",
    "clsx": "^2.x",
    "motion": "^11.x",
    "lucide-react": "latest",
    "sonner": "^1.x"
  },
  "devDependencies": {
    "drizzle-kit": "^0.x",
    "typescript": "^5.x"
  }
}
```

> Note: `howler` is optional — only add it if you choose custom audio files over the synthesized Web Audio API approach above. The native approach is recommended for its zero-dependency and instant-load characteristics.

---

## 17. Putting It All Together — The Complete Interaction for "Mark Complete"

Here is the full sequence of what happens when a user clicks the status toggle to complete a task — every layer firing together:

```
1. User clicks the status toggle icon
   → whileTap spring (scale 0.9, rotate 15°) fires immediately — 0ms

2. useOptimistic dispatch fires
   → Task visually updates to "completed" — 0ms

3. Sound plays
   → Two-tone ascending chime — ~0ms (Web Audio API, no network)

4. StatusBadge re-renders with new status
   → Animated scale pop (bouncy spring) — 80ms

5. Title gets strikethrough animation
   → Smooth spring transition — 150ms

6. Task row exits active list
   → AnimatePresence exit animation — 200ms

7. Task enters completed section
   → Entrance animation with LayoutGroup — 220ms

8. Server Action completes in background
   → revalidatePath fires, Server re-renders with canonical data
   → If it fails: optimistic state rolls back automatically
```

Total perceived interaction time: **0ms** (everything the user sees happens before the server responds).
