"use client";

import { useOptimistic, useTransition, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import TaskItem from "./task-item";
import AddTaskForm from "./add-task-form";
import { createTask, updateTaskStatus, deleteTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { playSound } from "@/lib/sound";
import { springs } from "@/lib/motion";
import type { Task, TaskStatus, Group } from "@/lib/db/schema";

const COMPLETE_EXIT_DELAY = 600; // ms — time for strikethrough animation before task exits

type Action =
  | { type: "add"; task: Task }
  | { type: "update_status"; taskId: string; status: TaskStatus }
  | { type: "update_task"; taskId: string; title: string; dueDate: Date | null; groupId: string | null }
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
          ? { ...t, title: action.title, dueDate: action.dueDate, groupId: action.groupId, updatedAt: new Date() }
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
  title: string;
  defaultDate?: Date | null;
  initialGroups?: Group[];
}

export default function TaskList({
  initialTasks,
  mode,
  title,
  defaultDate,
  initialGroups = [],
}: TaskListProps) {
  const [optimisticTasks, dispatch] = useOptimistic(initialTasks, taskReducer);
  const [, startTransition] = useTransition();
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  // Tasks mid-completion animation — status NOT yet updated in optimistic state so sort is unaffected
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  function toggleMonth(label: string) {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function handleAdd(title: string, dueDate: Date | null, id: string, groupId: string | null) {
    const optimisticTask: Task = {
      id,
      userId: "",
      title,
      status: "not_started",
      dueDate,
      groupId: groupId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    playSound("add");
    startTransition(async () => {
      dispatch({ type: "add", task: optimisticTask });
      try {
        await createTask({ title, dueDate: dueDate ?? undefined, id, groupId: groupId ?? undefined });
      } catch {
        toast.error("Failed to add task");
      }
    });
  }

  function handleStatusChange(taskId: string, status: TaskStatus) {
    // When completing in a non-completed view: animate strikethrough in-place first,
    // then exit. We deliberately do NOT optimistic-dispatch yet so the task's status
    // stays unchanged in state — preserving its current sort position.
    if (status === "completed" && mode !== "completed") {
      playSound("complete");
      setCompletingIds((prev) => new Set([...prev, taskId]));

      // Fire the server update in parallel (revalidation will sync after animation)
      updateTaskStatus({ taskId, status }).catch(() => {
        toast.error("Failed to update status");
        setCompletingIds((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
      });

      // After animation, dispatch the optimistic removal so AnimatePresence exits it
      setTimeout(() => {
        startTransition(() => {
          dispatch({ type: "update_status", taskId, status });
        });
        setCompletingIds((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
      }, COMPLETE_EXIT_DELAY);
      return;
    }
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

  function handleUpdate(taskId: string, title: string, dueDate: Date | null, groupId: string | null) {
    startTransition(() => {
      dispatch({ type: "update_task", taskId, title, dueDate, groupId });
    });
  }

  const STATUS_ORDER: Record<string, number> = { in_progress: 0, not_started: 1 };

  // completingIds tasks still have their original status in optimistic state (dispatch deferred),
  // so they sort naturally at their original position — no special casing needed.
  const visibleTasks = mode === "completed"
    ? optimisticTasks
    : optimisticTasks.filter((t) => t.status !== "completed" || completingIds.has(t.id));

  const sortedTasks = mode === "completed"
    // Completed view: most recently completed first
    ? [...visibleTasks].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    : [...visibleTasks].sort((a, b) => {
        const statusDiff = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

  const isEmpty = sortedTasks.length === 0;
  const showAddForm = mode === "today" || mode === "incoming";

  // Group completed tasks by month for the completed view
  const completedMonths: { label: string; tasks: Task[] }[] = [];
  if (mode === "completed") {
    for (const task of sortedTasks) {
      const label = format(new Date(task.updatedAt), "MMMM yyyy");
      const last = completedMonths[completedMonths.length - 1];
      if (last?.label === label) last.tasks.push(task);
      else completedMonths.push({ label, tasks: [task] });
    }
  }

  return (
    <div className="space-y-4 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

      {showAddForm && (
        <AddTaskForm
          onAdd={handleAdd}
          defaultDate={defaultDate}
          groups={groups}
          onGroupCreated={(g) => setGroups((prev) => [...prev, g])}
        />
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
              {mode === "today"
                ? "Nothing due today."
                : mode === "incoming"
                  ? "No upcoming tasks."
                  : "No completed tasks yet."}
            </motion.div>
          ) : mode === "completed" ? (
            completedMonths.map((month) => {
              const isCollapsed = collapsedMonths.has(month.label);
              return (
                <div key={month.label}>
                  <button
                    onClick={() => toggleMonth(month.label)}
                    className="flex items-center gap-2 w-full text-left px-1 py-4 group hover:bg-neutral-100 rounded-md"
                  >
                    <motion.div
                      animate={{ rotate: isCollapsed ? -90 : 0 }}
                      transition={{ ease: "easeOut", duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                    <span className="text-base font-semibold text-foreground">
                      {month.label}
                    </span>
                    <AnimatePresence>
                      {isCollapsed && (
                        <motion.span
                          key="count"
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -4 }}
                          transition={{ ease: "easeOut", duration: 0.15 }}
                          className="text-xs text-muted-foreground font-normal"
                        >
                          {month.tasks.length} {month.tasks.length === 1 ? "task" : "tasks"}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                  <motion.div
                    initial={false}
                    animate={isCollapsed ? { height: 0, opacity: 0 } : { height: "auto", opacity: 1 }}
                    transition={{ ease: "easeOut", duration: 0.25 }}
                    style={{ overflow: "hidden" }}
                  >
                    {month.tasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        mode={mode}
                        group={groups.find((g) => g.id === task.groupId)}
                        groups={groups}
                        isExiting={completingIds.has(task.id)}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                        onGroupCreated={(g) => setGroups((prev) => [...prev, g])}
                      />
                    ))}
                  </motion.div>
                </div>
              );
            })
          ) : (
            sortedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                mode={mode}
                group={groups.find((g) => g.id === task.groupId)}
                groups={groups}
                isExiting={completingIds.has(task.id)}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onGroupCreated={(g) => setGroups((prev) => [...prev, g])}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
