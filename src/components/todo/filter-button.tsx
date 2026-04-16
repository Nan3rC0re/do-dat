'use client'

import { useState } from 'react'
import { SlidersHorizontal, ChevronRight, Check } from 'lucide-react'
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

type SubFilter = 'status' | 'priority' | 'tags'

interface FilterButtonProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  allTags: Tag[]
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
]

function StatusDot({ status }: { status: TaskStatus }) {
  if (status === 'not_started') return <span className="w-3.5 h-3.5 rounded-full border-2 border-neutral-300 shrink-0" />
  return <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-yellow-400 shrink-0" />
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span className={`w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-colors ${
      checked ? 'bg-foreground border-foreground' : 'border-neutral-300'
    }`}>
      {checked && <Check className="w-2.5 h-2.5 text-background" strokeWidth={3} />}
    </span>
  )
}

export default function FilterButton({ filters, onChange, allTags }: FilterButtonProps) {
  const [open, setOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<SubFilter | null>(null)

  const activeCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.priority !== 'all' ? 1 : 0) +
    filters.tagIds.length

  function handleOpenChange(o: boolean) {
    setOpen(o)
    if (!o) setActiveFilter(null)
  }

  function toggleSubFilter(sub: SubFilter) {
    setActiveFilter((prev) => (prev === sub ? null : sub))
  }

  const categories: { key: SubFilter; label: string; hasActive: boolean }[] = [
    { key: 'status',   label: 'Status',   hasActive: filters.status !== 'all' },
    { key: 'priority', label: 'Priority', hasActive: filters.priority !== 'all' },
    { key: 'tags',     label: 'Tags',     hasActive: filters.tagIds.length > 0 },
  ]

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`cursor-pointer relative flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-150 ${
                activeCount > 0
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-muted-foreground hover:bg-neutral-100 hover:text-foreground'
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
        <TooltipContent side="bottom" className="text-[10px] px-2 py-1">Filter tasks</TooltipContent>
      </Tooltip>

      <PopoverContent
        className="w-44 p-1"
        align="end"
        avoidCollisions
        collisionPadding={8}
      >
        {/* Category rows — each is the trigger for its own sub-dropdown */}
        {categories.map((cat) => (
          <Popover
            key={cat.key}
            open={activeFilter === cat.key}
            onOpenChange={(o) => setActiveFilter(o ? cat.key : null)}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`cursor-pointer w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm transition-colors ${
                  activeFilter === cat.key ? 'bg-accent' : 'hover:bg-accent'
                }`}
              >
                <span className={`flex-1 text-left ${activeFilter === cat.key ? 'font-medium' : ''}`}>
                  {cat.label}
                </span>
                {cat.hasActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                )}
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                  activeFilter === cat.key ? 'text-foreground' : 'text-muted-foreground'
                }`} />
              </button>
            </PopoverTrigger>

            <PopoverContent
              side="left"
              align="start"
              sideOffset={8}
              className="w-44 p-1"
              avoidCollisions
              collisionPadding={8}
              onInteractOutside={(e) => {
                // Don't dismiss when clicking inside the parent popover
                e.preventDefault()
              }}
            >
              {/* Status sub-dropdown */}
              {cat.key === 'status' && STATUS_OPTIONS.map((opt) => {
                const isActive = filters.status === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...filters, status: isActive ? 'all' : opt.value })}
                    className="cursor-pointer w-full flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors"
                  >
                    <CheckBox checked={isActive} />
                    <StatusDot status={opt.value} />
                    <span className={isActive ? 'font-medium' : ''}>{opt.label}</span>
                  </button>
                )
              })}

              {/* Priority sub-dropdown */}
              {cat.key === 'priority' && PRIORITY_OPTIONS.map((opt) => {
                const isActive = filters.priority === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...filters, priority: isActive ? 'all' : opt.value })}
                    className="cursor-pointer w-full flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors"
                  >
                    <CheckBox checked={isActive} />
                    <PriorityIcon priority={opt.value} className="w-3.5 h-3.5 shrink-0" />
                    <span className={isActive ? 'font-medium' : ''}>{opt.label}</span>
                  </button>
                )
              })}

              {/* Tags sub-dropdown */}
              {cat.key === 'tags' && (
                allTags.length === 0 ? (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">No tags yet</p>
                ) : (
                  allTags.map((tag) => {
                    const isActive = filters.tagIds.includes(tag.id)
                    const newTagIds = isActive
                      ? filters.tagIds.filter((id) => id !== tag.id)
                      : [...filters.tagIds, tag.id]
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => onChange({ ...filters, tagIds: newTagIds })}
                        className="cursor-pointer w-full flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors"
                      >
                        <CheckBox checked={isActive} />
                        <ColorDot color={tag.color} />
                        <span className={`flex-1 text-left ${isActive ? 'font-medium' : ''}`}>{tag.name}</span>
                      </button>
                    )
                  })
                )
              )}
            </PopoverContent>
          </Popover>
        ))}

        {/* Clear all */}
        {activeCount > 0 && (
          <>
            <div className="my-1 h-px bg-neutral-100" />
            <button
              type="button"
              onClick={() => { onChange(DEFAULT_FILTERS); setActiveFilter(null) }}
              className="cursor-pointer w-full flex items-center px-2 py-1.5 text-sm text-muted-foreground rounded-sm hover:bg-accent hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
