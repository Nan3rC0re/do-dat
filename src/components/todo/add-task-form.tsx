"use client";

import { useState, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { springs } from "@/lib/motion";
import TaskDatePicker from "./task-date-picker";

interface AddTaskFormProps {
  onAdd: (title: string, dueDate: Date | null, id: string) => void;
}

export default function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const [value, setValue] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;

    const id = crypto.randomUUID();
    const date = dueDate ?? null;

    setValue("");
    setDueDate(null);
    inputRef.current?.focus();

    onAdd(title, date, id);
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
        {/* Input row */}
        <div className="px-4 pt-3 pb-4 py-5">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="What do we need to get done?"
            className="w-full bg-transparent text-base sm:text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-3 pb-2">
          <TaskDatePicker value={dueDate} onChange={setDueDate} />

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
