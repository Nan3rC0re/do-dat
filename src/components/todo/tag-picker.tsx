'use client'

import { useState, useRef, useEffect } from 'react'
import { Tag, Check, Plus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createTag } from '@/lib/actions/tags'
import type { Tag as TagType } from '@/lib/db/schema'

// Static color map — never interpolate Tailwind class names dynamically
const COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  slate:   { bg: 'bg-slate-100',   text: 'text-slate-700',   dot: 'bg-slate-400' },
  red:     { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-400' },
  orange:  { bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-400' },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  lime:    { bg: 'bg-lime-100',    text: 'text-lime-700',    dot: 'bg-lime-400' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  teal:    { bg: 'bg-teal-100',    text: 'text-teal-700',    dot: 'bg-teal-400' },
  sky:     { bg: 'bg-sky-100',     text: 'text-sky-700',     dot: 'bg-sky-400' },
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  violet:  { bg: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-400' },
  purple:  { bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-400' },
  pink:    { bg: 'bg-pink-100',    text: 'text-pink-700',    dot: 'bg-pink-400' },
}

function getColors(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP.slate
}

export function ColorDot({ color, className }: { color: string; className?: string }) {
  const colors = getColors(color)
  return <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot} ${className ?? ''}`} />
}

export function TagPill({ tag }: { tag: TagType }) {
  const colors = getColors(tag.color)
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}
    >
      <ColorDot color={tag.color} />
      {tag.name}
    </span>
  )
}

interface TagPickerProps {
  allTags: TagType[]
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  onTagCreated: (tag: TagType) => void
}

export default function TagPicker({
  allTags,
  selectedTagIds,
  onChange,
  onTagCreated,
}: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setSearch('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  )

  const showCreate =
    search.trim().length > 0 &&
    !filtered.some((t) => t.name.toLowerCase() === search.trim().toLowerCase())

  async function handleCreate() {
    if (!search.trim() || creating) return
    setCreating(true)
    try {
      const tag = await createTag({ name: search.trim() })
      onTagCreated(tag)
      onChange([...selectedTagIds, tag.id])
      setSearch('')
    } finally {
      setCreating(false)
    }
  }

  function toggle(tagId: string) {
    onChange(
      selectedTagIds.includes(tagId)
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId],
    )
  }

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id))
  const hasSelected = selectedTags.length > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full transition-colors duration-150 ${
                hasSelected
                  ? 'bg-neutral-100 text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
          {hasSelected ? (
            <>
              {selectedTags.slice(0, 2).map((tag) => (
                <ColorDot key={tag.id} color={tag.color} />
              ))}
              <span className="text-xs">
                {selectedTags.length === 1
                  ? selectedTags[0].name
                  : selectedTags.length <= 2
                    ? selectedTags.map((t) => t.name).join(', ')
                    : `${selectedTags.slice(0, 2).map((t) => t.name).join(', ')} +${selectedTags.length - 2}`}
              </span>
            </>
          ) : (
            <>
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>Tags</span>
            </>
          )}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent className="text-[10px] px-2 py-1">Tags</TooltipContent>
      </Tooltip>
      <PopoverContent
        className="w-44 p-1"
        align="start"
        avoidCollisions
        collisionPadding={8}
      >
        {/* Search / create input */}
        <div className="px-2 py-1.5 border-b border-neutral-100 mb-1">
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (showCreate) handleCreate()
                else if (filtered.length === 1) toggle(filtered[0].id)
              }
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Search or create…"
            className="w-full text-sm outline-none bg-transparent placeholder:text-muted-foreground"
          />
        </div>

        {/* List */}
        <div className="max-h-48 overflow-y-auto">
          {showCreate && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 shrink-0 text-muted-foreground" />
              <span>Create &ldquo;{search.trim()}&rdquo;</span>
            </button>
          )}

          {filtered.length === 0 && !showCreate && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No tags found</p>
          )}

          {filtered.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggle(tag.id)}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors ${
                  isSelected ? 'font-medium' : ''
                }`}
              >
                <ColorDot color={tag.color} />
                <span className="flex-1 text-left">{tag.name}</span>
                {isSelected && (
                  <Check className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
