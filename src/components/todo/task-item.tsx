"use client";

import { useState, useRef } from "react";
import { motion, useMotionValue, animate } from "motion/react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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

const ACTION_WIDTH = 130;
const SNAP_THRESHOLD = 60;

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
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const [isActiveSwiped, setIsActiveSwiped] = useState(false);

  const x = useMotionValue(0);
  const swipeStartX = useRef<number | null>(null);
  const swipeIsOpen = useRef(false);

  function snapTo(targetX: number, open: boolean) {
    animate(x, targetX, springs.bouncy);
    setIsSwipeOpen(open);
    swipeIsOpen.current = open;
    setIsActiveSwiped(targetX !== 0);
  }

  function onTouchStart(e: React.TouchEvent) {
    if ((e.target as HTMLElement).closest("[data-no-swipe]")) return;
    swipeStartX.current = e.touches[0].clientX;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (swipeStartX.current === null) return;
    const dx = e.touches[0].clientX - swipeStartX.current;

    let newX: number;
    if (swipeIsOpen.current) {
      newX = Math.min(0, Math.max(-ACTION_WIDTH, -ACTION_WIDTH + dx));
    } else {
      if (dx > 5) return;
      newX = Math.max(-ACTION_WIDTH, dx);
    }

    setIsActiveSwiped(Math.abs(newX) > 5);
    x.set(newX);
  }

  function onTouchEnd() {
    if (swipeStartX.current === null) return;
    swipeStartX.current = null;

    const currentX = x.get();

    if (swipeIsOpen.current) {
      const draggedAmount = Math.abs(currentX - -ACTION_WIDTH);
      if (draggedAmount < 5) {
        // tap on open row → close
        snapTo(0, false);
      } else if (currentX > -SNAP_THRESHOLD) {
        snapTo(0, false);
      } else {
        snapTo(-ACTION_WIDTH, true);
      }
    } else {
      if (Math.abs(currentX) >= SNAP_THRESHOLD) {
        snapTo(-ACTION_WIDTH, true);
      } else {
        snapTo(0, false);
      }
    }
  }

  const isCompleted = task.status === "completed";
  const dateLabel =
    mode === "completed"
      ? formatTaskDate(task.updatedAt)
      : formatTaskDate(task.dueDate);
  const showActions = isHovered || menuOpen;

  function handleOptimisticUpdate(title: string, dueDate: Date | null) {
    onUpdate(task.id, title, dueDate);
  }

  function closeSwipe() {
    snapTo(0, false);
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{
          opacity: 0,
          y: -6,
          scale: 0.97,
          transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
        }}
        transition={springs.smooth}
        className="relative overflow-hidden rounded-xl"
      >
        {/* Action buttons revealed on swipe (mobile) */}
        <div
          className="absolute inset-y-0 right-0 z-0 flex items-stretch sm:hidden"
          style={{ width: ACTION_WIDTH }}
        >
          <button
            data-no-swipe="true"
            onClick={() => {
              closeSwipe();
              setEditOpen(true);
            }}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-primary text-white text-xs font-medium"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          <button
            data-no-swipe="true"
            onClick={() => {
              closeSwipe();
              onDelete(task.id);
            }}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-destructive text-white text-xs font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>

        {/* Task row */}
        <motion.div
          style={{
            x,
            backgroundColor: isActiveSwiped
              ? "var(--color-neutral-100, #f5f5f5)"
              : "white",
          }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
          className={`relative z-10 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-100 select-none ${
            !isActiveSwiped ? "hover:bg-neutral-100" : ""
          }`}
        >
          <div data-no-swipe="true">
            <StatusToggle
              status={task.status}
              onStatusChange={(status) => onStatusChange(task.id, status)}
            />
          </div>

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

            {/* Desktop-only dropdown */}
            <div
              className={`hidden sm:block ${showActions ? "visible" : "invisible"}`}
            >
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    data-no-swipe="true"
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
