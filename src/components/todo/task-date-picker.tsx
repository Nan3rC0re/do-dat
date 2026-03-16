'use client'

import { useState } from 'react'
import { format, isToday } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

interface TaskDatePickerProps {
  value?: Date | null
  onChange: (date: Date | null) => void
}

function formatDate(date: Date): string {
  if (isToday(date)) return 'Today'
  return format(date, 'MMM d')
}

export default function TaskDatePicker({ value, onChange }: TaskDatePickerProps) {
  const [open, setOpen] = useState(false)
  const hasDate = !!value

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full transition-colors duration-150 ${
            hasDate
              ? 'bg-sky-100 text-sky-700 font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{hasDate ? formatDate(value!) : 'Date'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(day) => {
            onChange(day ?? null)
            setOpen(false)
          }}
          initialFocus
        />
        {hasDate && (
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground py-1 transition-colors"
            >
              Clear date
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
