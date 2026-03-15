"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { MoreHorizontal } from "lucide-react";
import { format, isToday } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatusToggle from "./status-toggle";
import EditTaskSheet from "./edit-task-sheet";
import { springs } from "@/lib/motion";
import type { Task, TaskStatus } from "@/lib/db/schema";

interface TaskItemProps {
  task: Task;
  mode: "inbox" | "today" | "incoming" | "completed";
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, title: string, dueDate: Date | null) => void;
}

function formatTaskDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return "Today";
  return format(d, "MMM d");
}

export default function TaskItem({
  task,
  mode,
  onStatusChange,
  onDelete,
  onUpdate,
}: TaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isTouchSelected, setIsTouchSelected] = useState(false);

  const rowRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    function handleTouchOutside(e: TouchEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setIsTouchSelected(false);
      }
    }
    document.addEventListener("touchstart", handleTouchOutside);
    return () => document.removeEventListener("touchstart", handleTouchOutside);
  }, []);

  const isCompleted = task.status === "completed";
  const dateLabel =
    mode === "completed"
      ? formatTaskDate(task.updatedAt)
      : formatTaskDate(task.dueDate);
  const showActions = isHovered || menuOpen || isTouchSelected;

  function handleOptimisticUpdate(title: string, dueDate: Date | null) {
    onUpdate(task.id, title, dueDate);
  }

  return (
    <>
      <motion.div
        ref={rowRef}
        layout="position"
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{
          opacity: 0,
          y: -6,
          scale: 0.97,
          transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
        }}
        transition={springs.smooth}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onTouchStart={(e) => {
          touchStartY.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          if (touchStartY.current === null) return;
          const dy = Math.abs(
            e.changedTouches[0].clientY - touchStartY.current,
          );
          touchStartY.current = null;
          if (dy < 10) setIsTouchSelected(true);
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-colors duration-100 select-none"
      >
        <StatusToggle
          status={task.status}
          onStatusChange={(status) => onStatusChange(task.id, status)}
        />

        <span
          className={`flex-1 text-sm leading-snug transition-all duration-200 ${
            isCompleted
              ? "line-through text-muted-foreground"
              : "text-foreground"
          }`}
        >
          {task.title}
        </span>

        <div className="w-14 h-6 flex items-center justify-end shrink-0 relative">
          {dateLabel && (
            <span
              className={`text-xs text-muted-foreground whitespace-nowrap transition-opacity duration-100 ${
                showActions ? "opacity-0 pointer-events-none" : ""
              }`}
            >
              {dateLabel}
            </span>
          )}
          <div
            className={`absolute inset-y-0 right-0 flex items-center transition-opacity duration-100 ${
              showActions ? "" : "opacity-0 pointer-events-none"
            }`}
          >
            <DropdownMenu
              open={menuOpen}
              onOpenChange={(open) => {
                setMenuOpen(open);
                if (!open) setIsTouchSelected(false);
              }}
            >
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Task options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  onClick={() => {
                    setMenuOpen(false);
                    setEditOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(task.id)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      <EditTaskSheet
        task={task}
        open={editOpen}
        onOpenChange={setEditOpen}
        onOptimisticUpdate={handleOptimisticUpdate}
      />
    </>
  );
}
