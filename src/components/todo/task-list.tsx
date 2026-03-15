"use client";

import { useOptimistic, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { format } from "date-fns";
import TaskItem from "./task-item";
import AddTaskForm from "./add-task-form";
import { createTask, updateTaskStatus, deleteTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { playSound } from "@/lib/sound";
import { springs } from "@/lib/motion";
import type { Task, TaskStatus } from "@/lib/db/schema";

type Action =
  | { type: "add"; task: Task }
  | { type: "update_status"; taskId: string; status: TaskStatus }
  | { type: "update_task"; taskId: string; title: string; dueDate: Date | null }
  | { type: "delete"; taskId: string };

function taskReducer(state: Task[], action: Action): Task[] {
  switch (action.type) {
    case "add":
      return [action.task, ...state];
    case "update_status":
      return state.map((t) =>
        t.id === action.taskId
          ? { ...t, status: action.status, updatedAt: new Date() }
          : t,
      );
    case "update_task":
      return state.map((t) =>
        t.id === action.taskId
          ? {
              ...t,
              title: action.title,
              dueDate: action.dueDate,
              updatedAt: new Date(),
            }
          : t,
      );
    case "delete":
      return state.filter((t) => t.id !== action.taskId);
    default:
      return state;
  }
}

interface TaskListProps {
  initialTasks: Task[];
  mode: "inbox" | "today" | "incoming" | "completed";
}

export default function TaskList({ initialTasks, mode }: TaskListProps) {
  const [optimisticTasks, dispatch] = useOptimistic(initialTasks, taskReducer);
  const [, startTransition] = useTransition();

  // All optimistic dispatches must happen inside startTransition
  function handleAdd(title: string, dueDate: Date | null, id: string) {
    const optimisticTask: Task = {
      id,
      userId: "",
      title,
      status: "not_started",
      dueDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    playSound("add");
    startTransition(async () => {
      dispatch({ type: "add", task: optimisticTask });
      try {
        await createTask({ title, dueDate: dueDate ?? undefined, id });
      } catch {
        toast.error("Failed to add task");
      }
    });
  }

  function handleStatusChange(taskId: string, status: TaskStatus) {
    if (status === "completed") playSound("complete");
    startTransition(async () => {
      dispatch({ type: "update_status", taskId, status });
      try {
        await updateTaskStatus({ taskId, status });
      } catch {
        toast.error("Failed to update status");
      }
    });
  }

  function handleDelete(taskId: string) {
    startTransition(async () => {
      dispatch({ type: "delete", taskId });
      try {
        await deleteTask({ taskId });
      } catch {
        toast.error("Failed to delete task");
      }
    });
  }

  function handleUpdate(taskId: string, title: string, dueDate: Date | null) {
    startTransition(() => {
      dispatch({ type: "update_task", taskId, title, dueDate });
    });
  }

  const STATUS_ORDER: Record<string, number> = { in_progress: 0, not_started: 1 };
  const visibleTasks = mode === "completed"
    ? optimisticTasks
    : optimisticTasks.filter((t) => t.status !== "completed");
  const sortedTasks = [...visibleTasks].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const isEmpty = sortedTasks.length === 0;

  return (
    <div className="space-y-4 pb-16">
      {(mode === "inbox" || mode === "today") && (
        <AddTaskForm onAdd={handleAdd} />
      )}

      <div className="mt-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ ...springs.gentle, delay: 0.1 }}
              className="text-center py-12 text-muted-foreground text-sm"
            >
              {mode === "inbox"
                ? "All clear. Add something to get started."
                : mode === "today"
                  ? "Nothing due today."
                  : mode === "incoming"
                    ? "No upcoming tasks."
                    : "No completed tasks yet."}
            </motion.div>
          ) : mode === "completed" ? (
            (() => {
              const groups: { label: string; tasks: Task[] }[] = [];
              for (const task of sortedTasks) {
                const label = format(new Date(task.updatedAt), "MMMM yyyy");
                const last = groups[groups.length - 1];
                if (last?.label === label) last.tasks.push(task);
                else groups.push({ label, tasks: [task] });
              }
              return groups.map((group) => (
                <div key={group.label}>
                  <div className="text-base font-semibold text-foreground px-1 pt-4 pb-1">
                    {group.label}
                  </div>
                  {group.tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      mode={mode}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      onUpdate={handleUpdate}
                    />
                  ))}
                </div>
              ));
            })()
          ) : (
            sortedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                mode={mode}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
