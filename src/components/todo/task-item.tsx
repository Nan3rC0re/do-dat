"use client";

import { useState, useRef } from "react";
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
  onStatusChange,
  onDelete,
  onUpdate,
}: TaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);

  function startLongPress(e: React.TouchEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    touchOrigin.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimer.current = setTimeout(() => setMenuOpen(true), 1000);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchOrigin.current = null;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchOrigin.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchOrigin.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchOrigin.current.y);
    if (dx > 8 || dy > 8) cancelLongPress();
  }

  const isCompleted = task.status === "completed";
  const dateLabel = formatTaskDate(task.dueDate);
  // Keep actions visible while the menu is open so it doesn't disappear mid-interaction
  const showActions = isHovered || menuOpen;

  function handleOptimisticUpdate(title: string, dueDate: Date | null) {
    onUpdate(task.id, title, dueDate);
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: 16, scale: 0.98 }}
        transition={springs.smooth}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchMove={handleTouchMove}
        onContextMenu={(e) => e.preventDefault()}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-100 select-none ${
          isCompleted || showActions ? "hover:bg-neutral-50" : ""
        }`}
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

        <div className="flex items-center gap-2 ml-auto">
          {dateLabel && !showActions && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {dateLabel}
            </span>
          )}

          {/* Always rendered so pointer events don't get cut off by conditional unmount */}
          <div className={showActions ? "visible" : "invisible"}>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
