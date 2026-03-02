'use client'

import { useState, useRef } from 'react'
import { Plus, ArrowUp } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { springs } from '@/lib/motion'
import TaskDatePicker from './task-date-picker'

interface AddTaskFormProps {
  onAdd: (title: string, dueDate: Date | null, id: string) => void
}

export default function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const [value, setValue] = useState('')
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const title = value.trim()
    if (!title) return

    // Generate a stable ID client-side so the optimistic and server task share the same key
    const id = crypto.randomUUID()
    const date = dueDate

    // Clear immediately for snappy UX
    setValue('')
    setDueDate(null)
    inputRef.current?.focus()

    onAdd(title, date, id)
  }

  const hasContent = value.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="relative flex items-center bg-gray-50 rounded-2xl px-4 py-3">
        <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0 mr-3" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="What do we need to get done?"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />

        <AnimatePresence>
          {hasContent && (
            <motion.button
              type="submit"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={springs.bouncy}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-600 hover:bg-violet-700 flex items-center justify-center text-white ml-2 transition-colors"
              aria-label="Add task"
            >
              <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="px-1">
        <TaskDatePicker value={dueDate} onChange={setDueDate} />
      </div>
    </form>
  )
}
