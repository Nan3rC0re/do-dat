'use client'

import { useState } from 'react'
import { Minus, SignalLow, SignalMedium, SignalHigh, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { TaskPriority } from '@/lib/db/schema'

interface PriorityOption {
  value: TaskPriority
  label: string
  Icon: React.FC<{ className?: string }>
  iconClass: string
  activeClass: string
}

export const PRIORITY_OPTIONS: PriorityOption[] = [
  {
    value: 'no_priority',
    label: 'No priority',
    Icon: Minus,
    iconClass: 'text-muted-foreground',
    activeClass: 'text-muted-foreground',
  },
  {
    value: 'low',
    label: 'Low',
    Icon: SignalLow,
    iconClass: 'text-sky-500',
    activeClass: 'text-sky-600',
  },
  {
    value: 'medium',
    label: 'Medium',
    Icon: SignalMedium,
    iconClass: 'text-amber-500',
    activeClass: 'text-amber-600',
  },
  {
    value: 'high',
    label: 'High',
    Icon: SignalHigh,
    iconClass: 'text-orange-500',
    activeClass: 'text-orange-600',
  },
]

export function PriorityIcon({
  priority,
  className,
}: {
  priority: TaskPriority
  className?: string
}) {
  const opt = PRIORITY_OPTIONS.find((o) => o.value === priority)!
  return <opt.Icon className={`${opt.iconClass} ${className ?? ''}`} />
}

interface PriorityPickerProps {
  value: TaskPriority
  onChange: (priority: TaskPriority) => void
}

export default function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  const [open, setOpen] = useState(false)
  const current = PRIORITY_OPTIONS.find((o) => o.value === value)!

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full transition-colors duration-150 ${
                value !== 'no_priority'
                  ? `bg-neutral-100 ${current.activeClass} font-medium`
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <current.Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{value !== 'no_priority' ? current.label : 'Priority'}</span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent className="text-[10px] px-2 py-1">Priority</TooltipContent>
      </Tooltip>
      <PopoverContent
        className="w-44 p-1"
        align="start"
        avoidCollisions
        collisionPadding={8}
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChange(opt.value)
              setOpen(false)
            }}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors"
          >
            <opt.Icon className={`w-4 h-4 shrink-0 ${opt.iconClass}`} />
            <span className={value === opt.value ? 'font-medium' : ''}>{opt.label}</span>
            {value === opt.value && (
              <Check className="ml-auto w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
