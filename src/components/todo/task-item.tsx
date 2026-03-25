"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { MoreHorizontal } from "lucide-react";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatusToggle from "./status-toggle";
import EditTaskSheet from "./edit-task-sheet";
import { springs } from "@/lib/motion";
import type { Task, TaskStatus, Group } from "@/lib/db/schema";

interface TaskItemProps {
  task: Task;
  mode: "inbox" | "today" | "incoming" | "completed";
  group?: Group;
  groups?: Group[];
  isExiting?: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, title: string, dueDate: Date | null, groupId: string | null) => void;
  onGroupCreated?: (group: Group) => void;
}

function formatTaskDate(
  date: Date | string | null | undefined,
  showToday = false,
): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return showToday ? "Today" : null;
  return format(d, "MMM d");
}

export default function TaskItem({
  task,
  mode,
  group,
  groups = [],
  isExiting = false,
  onStatusChange,
  onDelete,
  onUpdate,
  onGroupCreated,
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

  // isExiting means the task is mid-completion animation (status not yet updated in optimistic state)
  const isCompleted = task.status === "completed" || isExiting;

  const taskDueDate = task.dueDate
    ? typeof task.dueDate === "string" ? new Date(task.dueDate) : task.dueDate
    : null;
  const isOverdue = mode === "today" && taskDueDate !== null && isBefore(taskDueDate, startOfDay(new Date()));

  const dateLabel =
    mode === "completed"
      ? formatTaskDate(task.updatedAt, true)       // show "Today" for tasks completed today
      : isOverdue
        ? format(taskDueDate!, "MMM d")            // always show overdue date in today view
        : formatTaskDate(task.dueDate);             // hide "Today" — user already knows today's date

  const showActions = isHovered || menuOpen || isTouchSelected;
  const showMeta = !!(dateLabel || group);

  function handleOptimisticUpdate(title: string, dueDate: Date | null, groupId: string | null) {
    onUpdate(task.id, title, dueDate, groupId);
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
          const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
          touchStartY.current = null;
          if (dy < 10) setIsTouchSelected(true);
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="relative w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-colors duration-100 select-none"
      >
        {/* Status circle — nudged down to align with first line of text */}
        <div className="pt-0.5 shrink-0">
          <StatusToggle
            status={isExiting ? "completed" : task.status}
            onStatusChange={(status) => onStatusChange(task.id, status)}
          />
        </div>

        {/* Main content column */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              {/* inline-block so the absolute line is scoped to the text width, not the full container */}
              <span
                className={`relative inline-block text-sm leading-snug ${
                  isCompleted
                    ? isExiting
                      ? "text-muted-foreground"
                      : "line-through text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {task.title}
                {isExiting && (
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-muted-foreground/60 origin-left pointer-events-none rounded-full"
                  />
                )}
              </span>
            </div>

            {/* "..." menu — visible on hover/touch */}
            <div
              className={`shrink-0 transition-opacity duration-100 ${
                showActions ? "opacity-100" : "opacity-0 pointer-events-none"
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

          {/* Meta row — date + group badge */}
          {showMeta && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {dateLabel && (
                <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                  {dateLabel}
                </span>
              )}
              {/* GROUP BADGE — hidden until groups feature is re-enabled
              {group && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  {group.name}
                </span>
              )}
              */}
            </div>
          )}
        </div>
      </motion.div>

      <EditTaskSheet
        task={task}
        open={editOpen}
        onOpenChange={setEditOpen}
        onOptimisticUpdate={handleOptimisticUpdate}
        groups={groups}
        onGroupCreated={onGroupCreated}
      />
    </>
  );
}
