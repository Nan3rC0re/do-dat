'use client'

import { motion, AnimatePresence } from 'motion/react'
import { Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TaskStatus } from '@/lib/db/schema'

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
]

function StatusIcon({ status }: { status: TaskStatus }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === 'not_started' && (
        <motion.div
          key="not_started"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ duration: 0.12, ease: 'easeInOut' }}
          className="w-5 h-5 rounded-full border-2 border-gray-300"
        />
      )}
      {status === 'in_progress' && (
        <motion.div
          key="in_progress"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ duration: 0.12, ease: 'easeInOut' }}
          className="w-5 h-5 rounded-full border-2 border-dashed border-yellow-400"
        />
      )}
      {status === 'completed' && (
        <motion.div
          key="completed"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ duration: 0.12, ease: 'easeInOut' }}
          className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function StatusIndicator({ status }: { status: TaskStatus }) {
  if (status === 'not_started') return <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
  if (status === 'in_progress') return <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-yellow-400 flex-shrink-0" />
  return (
    <div className="w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
      <Check className="w-2 h-2 text-white" strokeWidth={3} />
    </div>
  )
}

interface StatusToggleProps {
  status: TaskStatus
  onStatusChange: (status: TaskStatus) => void
}

export default function StatusToggle({ status, onStatusChange }: StatusToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="flex-shrink-0 w-5 h-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-full"
          aria-label={`Status: ${status}`}
        >
          <StatusIcon status={status} />
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {STATUS_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onStatusChange(opt.value)}
            className="cursor-pointer gap-2.5"
          >
            <StatusIndicator status={opt.value} />
            <span className={status === opt.value ? 'font-medium' : ''}>{opt.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
