"use client";

import { useState, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { springs } from "@/lib/motion";
import TaskDatePicker from "./task-date-picker";
import GroupPicker from "./group-picker";
import type { Group } from "@/lib/db/schema";

interface AddTaskFormProps {
  onAdd: (title: string, dueDate: Date | null, id: string, groupId: string | null) => void;
  defaultDate?: Date | null;
  groups?: Group[];
  onGroupCreated?: (group: Group) => void;
}

export default function AddTaskForm({
  onAdd,
  defaultDate,
  groups,
  onGroupCreated,
}: AddTaskFormProps) {
  const [value, setValue] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(defaultDate ?? null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;

    const id = crypto.randomUUID();
    const date = dueDate ?? null;

    setValue("");
    setDueDate(defaultDate ?? null);
    setGroupId(null);
    inputRef.current?.focus();

    onAdd(title, date, id, groupId);
  }

  const hasContent = value.trim().length > 0;

  function handleContainerClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        onClick={handleContainerClick}
        className="cursor-text bg-neutral-100 rounded-2xl overflow-hidden border border-transparent focus-within:border-neutral-200 transition-colors"
      >
        <div className="px-4 pt-3 pb-4 py-5">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="What do we need to get done?"
            className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-1">
            <TaskDatePicker value={dueDate} onChange={setDueDate} />
            {groups !== undefined && (
              <GroupPicker
                groups={groups}
                value={groupId}
                onChange={setGroupId}
                onGroupCreated={(group) => onGroupCreated?.(group)}
              />
            )}
          </div>

          <AnimatePresence>
            {hasContent && (
              <motion.button
                type="submit"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={springs.bouncy}
                className="shrink-0 w-7 h-7 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center text-white transition-colors"
                aria-label="Add task"
              >
                <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </form>
  );
}
