"use client";

import { useState, useRef, useEffect } from "react";
import { Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createGroup } from "@/lib/actions/groups";
import type { Group } from "@/lib/db/schema";

interface GroupPickerProps {
  groups: Group[];
  value: string | null;
  onChange: (groupId: string | null) => void;
  onGroupCreated: (group: Group) => void;
}

export default function GroupPicker({
  groups,
  value,
  onChange,
  onGroupCreated,
}: GroupPickerProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedGroup = groups.find((g) => g.id === value) ?? null;

  useEffect(() => {
    if (open) {
      setNewName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const group = await createGroup({ name });
      onGroupCreated(group);
      onChange(group.id);
      setNewName("");
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full transition-colors duration-150 ${
            selectedGroup
              ? "bg-amber-100 text-amber-700 font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tag className="w-3.5 h-3.5 shrink-0" />
          <span>{selectedGroup ? selectedGroup.name : "Group"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-0"
        align="start"
        avoidCollisions
        collisionPadding={8}
      >
        {/* New group input at the top */}
        <div className="px-3 py-2 flex items-center gap-1.5 border-b border-neutral-100">
          <input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="New group…"
            className="flex-1 text-xs outline-none bg-transparent placeholder:text-muted-foreground"
          />
          {newName.trim() && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="text-xs text-amber-600 font-medium disabled:opacity-50 shrink-0"
            >
              Add
            </button>
          )}
        </div>

        {/* Existing groups */}
        <div className="py-1">
          {selectedGroup && (
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className="w-full text-left text-xs px-3 py-2 hover:bg-neutral-50 text-muted-foreground transition-colors"
            >
              No group
            </button>
          )}

          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => { onChange(group.id); setOpen(false); }}
              className={`w-full text-left text-xs px-3 py-2 flex items-center gap-2 hover:bg-amber-50 transition-colors ${
                group.id === value ? "text-amber-700 font-medium" : "text-foreground"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              {group.name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
