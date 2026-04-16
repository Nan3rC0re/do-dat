'use client'

import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PriorityIcon, PRIORITY_OPTIONS } from './priority-picker'
import { ColorDot } from './tag-picker'
import type { Tag, TaskPriority, TaskStatus } from '@/lib/db/schema'

export interface FilterState {
  status: 'all' | TaskStatus
  priority: 'all' | TaskPriority
  tagIds: string[]
}

export const DEFAULT_FILTERS: FilterState = {
  status: 'all',
  priority: 'all',
  tagIds: [],
}

interface FilterButtonProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  allTags: Tag[]
}

const STATUS_OPTIONS: { value: FilterState['status']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
]

export default function FilterButton({ filters, onChange, allTags }: FilterButtonProps) {
  const [open, setOpen] = useState(false)

  const activeCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.priority !== 'all' ? 1 : 0) +
    filters.tagIds.length

  function setStatus(status: FilterState['status']) {
    onChange({ ...filters, status })
  }

  function setPriority(priority: FilterState['priority']) {
    onChange({ ...filters, priority })
  }

  function toggleTag(tagId: string) {
    const tagIds = filters.tagIds.includes(tagId)
      ? filters.tagIds.filter((id) => id !== tagId)
      : [...filters.tagIds, tagId]
    onChange({ ...filters, tagIds })
  }

  function clearAll() {
    onChange(DEFAULT_FILTERS)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`cursor-pointer relative flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-150 ${
                activeCount > 0
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-foreground hover:bg-neutral-200'
              }`}
              aria-label="Filter tasks"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              {activeCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {activeCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent className="text-[10px] px-2 py-1">Filter tasks</TooltipContent>
      </Tooltip>

      <PopoverContent
        className="w-64 p-3 space-y-4"
        align="end"
        avoidCollisions
        collisionPadding={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Filters
          </span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="cursor-pointer flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`cursor-pointer text-xs px-2.5 py-1 rounded-full transition-colors ${
                  filters.status === opt.value
                    ? 'bg-neutral-900 text-white font-medium'
                    : 'bg-neutral-100 text-foreground hover:bg-neutral-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Priority</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setPriority('all')}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                filters.priority === 'all'
                  ? 'bg-neutral-900 text-white font-medium'
                  : 'bg-neutral-100 text-foreground hover:bg-neutral-200'
              }`}
            >
              All
            </button>
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPriority(opt.value)}
                className={`cursor-pointer flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${
                  filters.priority === opt.value
                    ? 'bg-neutral-900 text-white font-medium'
                    : 'bg-neutral-100 text-foreground hover:bg-neutral-200'
                }`}
              >
                <PriorityIcon
                  priority={opt.value}
                  className={`w-3 h-3 shrink-0 ${filters.priority === opt.value ? '!text-white' : ''}`}
                />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => {
                const isActive = filters.tagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`cursor-pointer flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${
                      isActive
                        ? 'bg-neutral-900 text-white font-medium'
                        : 'bg-neutral-100 text-foreground hover:bg-neutral-200'
                    }`}
                  >
                    <ColorDot color={tag.color} className={isActive ? '!bg-white/70' : ''} />
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
