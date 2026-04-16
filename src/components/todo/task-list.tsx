"use client";

import { useOptimistic, useTransition, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { format, isBefore, startOfDay } from "date-fns";
import { ChevronDown, X } from "lucide-react";
import TaskItem from "./task-item";
import AddTaskForm from "./add-task-form";
import FilterButton, { DEFAULT_FILTERS, type FilterState } from "./filter-button";
import { PRIORITY_OPTIONS } from "./priority-picker";
import { createTask, updateTaskStatus, deleteTask, updateTask } from "@/lib/actions/tasks";
import { setTaskTags } from "@/lib/actions/tags";
import { toast } from "sonner";
import { playSound } from "@/lib/sound";
import { springs } from "@/lib/motion";
import type { TaskWithTags, TaskStatus, TaskPriority, Group, Tag } from "@/lib/db/schema";

const COMPLETE_EXIT_DELAY = 600; // ms — time for strikethrough animation before task exits

type Action =
  | { type: "add"; task: TaskWithTags }
  | { type: "update_status"; taskId: string; status: TaskStatus }
  | { type: "update_task"; taskId: string; title: string; dueDate: Date | null; groupId: string | null; priority: TaskPriority }
  | { type: "update_tags"; taskId: string; tags: Tag[] }
  | { type: "delete"; taskId: string };

function taskReducer(state: TaskWithTags[], action: Action): TaskWithTags[] {
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
          ? { ...t, title: action.title, dueDate: action.dueDate, groupId: action.groupId, priority: action.priority, updatedAt: new Date() }
          : t,
      );
    case "update_tags":
      return state.map((t) =>
        t.id === action.taskId ? { ...t, tags: action.tags } : t,
      );
    case "delete":
      return state.filter((t) => t.id !== action.taskId);
    default:
      return state;
  }
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  no_priority: 3,
}

function taskTier(task: TaskWithTags): number {
  const overdue =
    task.dueDate !== null &&
    task.dueDate !== undefined &&
    isBefore(new Date(task.dueDate), startOfDay(new Date()))

  if (task.status === "in_progress" && task.priority !== "no_priority") return 0
  if (task.status === "not_started" && task.priority !== "no_priority") return 1
  if (task.status === "in_progress") return 2
  if (task.status === "not_started" && overdue) return 3
  return 4
}

interface TaskListProps {
  initialTasks: TaskWithTags[];
  mode: "inbox" | "today" | "incoming" | "completed";
  title: string;
  defaultDate?: Date | null;
  initialGroups?: Group[];
  initialTags?: Tag[];
}

export default function TaskList({
  initialTasks,
  mode,
  title,
  defaultDate,
  initialGroups = [],
  initialTags = [],
}: TaskListProps) {
  const [optimisticTasks, dispatch] = useOptimistic(initialTasks, taskReducer);
  const [, startTransition] = useTransition();
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [allTags, setAllTags] = useState<Tag[]>(initialTags);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
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

  function handleAdd(title: string, dueDate: Date | null, id: string, groupId: string | null, priority: TaskPriority, tagIds: string[]) {
    const optimisticTask: TaskWithTags = {
      id,
      userId: "",
      title,
      status: "not_started",
      priority: priority ?? "no_priority",
      dueDate,
      groupId: groupId ?? null,
      tags: allTags.filter((t) => tagIds.includes(t.id)),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    playSound("add");
    startTransition(async () => {
      dispatch({ type: "add", task: optimisticTask });
      try {
        await createTask({ title, dueDate: dueDate ?? undefined, id, groupId: groupId ?? undefined, priority, tagIds });
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

  function handleUpdate(taskId: string, title: string, dueDate: Date | null, groupId: string | null, priority: TaskPriority) {
    startTransition(() => {
      dispatch({ type: "update_task", taskId, title, dueDate, groupId, priority });
    });
    // Fire server action (fire-and-forget in transition, errors toasted in edit sheet)
    updateTask({ taskId, title, dueDate, groupId, priority }).catch(() => {
      toast.error("Failed to update task");
    });
  }

  function handleTagsChange(taskId: string, tagIds: string[]) {
    const updatedTags = allTags.filter((t) => tagIds.includes(t.id));
    startTransition(() => {
      dispatch({ type: "update_tags", taskId, tags: updatedTags });
    });
    setTaskTags({ taskId, tagIds }).catch(() => {
      toast.error("Failed to update tags");
    });
  }

  function handleTagCreated(tag: Tag) {
    setAllTags((prev) => [...prev, tag]);
  }

  const visibleTasks = mode === "completed"
    ? optimisticTasks
    : optimisticTasks.filter((t) => t.status !== "completed" || completingIds.has(t.id));

  // Apply filters — completingIds tasks always bypass filter to avoid interrupting exit animation
  const filteredTasks = mode === "completed"
    ? visibleTasks.filter((task) => {
        if (filters.tagIds.length > 0 && !filters.tagIds.some((id) => task.tags.some((t) => t.id === id))) return false
        return true
      })
    : visibleTasks.filter((task) => {
        if (completingIds.has(task.id)) return true
        if (filters.status !== "all" && task.status !== filters.status) return false
        if (filters.priority !== "all" && task.priority !== filters.priority) return false
        if (filters.tagIds.length > 0 && !filters.tagIds.some((id) => task.tags.some((t) => t.id === id))) return false
        return true
      });

  const sortedTasks = mode === "completed"
    // Completed view: most recently completed first
    ? [...filteredTasks].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    : [...filteredTasks].sort((a, b) => {
        const tierDiff = taskTier(a) - taskTier(b)
        if (tierDiff !== 0) return tierDiff
        // Within tiers 0 and 1 (has priority), sort by priority level
        const aTier = taskTier(a)
        if (aTier <= 1) {
          const pd = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
          if (pd !== 0) return pd
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      });

  const isEmpty = sortedTasks.length === 0;
  const showAddForm = mode === "today" || mode === "incoming";

  // Group completed tasks by month for the completed view
  const completedMonths: { label: string; tasks: TaskWithTags[] }[] = [];
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
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {(showAddForm || mode === "completed") && (
          <FilterButton
            filters={filters}
            onChange={setFilters}
            allTags={allTags}
            tagsOnly={mode === "completed"}
          />
        )}
      </div>

      {showAddForm && (filters.status !== "all" || filters.priority !== "all" || filters.tagIds.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {filters.status !== "all" && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-neutral-100 text-foreground font-medium">
              {filters.status === "not_started" ? "Not started" : "In progress"}
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, status: "all" }))}
                className="cursor-pointer ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear status filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.priority !== "all" && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-neutral-100 text-foreground font-medium">
              {PRIORITY_OPTIONS.find((o) => o.value === filters.priority)?.label}
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, priority: "all" }))}
                className="cursor-pointer ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear priority filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.tagIds.map((tagId) => {
            const tag = allTags.find((t) => t.id === tagId)
            if (!tag) return null
            return (
              <span key={tagId} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-neutral-100 text-foreground font-medium">
                {tag.name}
                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, tagIds: f.tagIds.filter((id) => id !== tagId) }))}
                  className="cursor-pointer ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={`Clear ${tag.name} tag filter`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {showAddForm && (
        <AddTaskForm
          onAdd={handleAdd}
          defaultDate={defaultDate}
          groups={groups}
          allTags={allTags}
          onTagCreated={handleTagCreated}
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
                    className="cursor-pointer flex items-center gap-2 w-full text-left px-1 py-4 group hover:bg-neutral-100 rounded-md"
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
                        allTags={allTags}
                        isExiting={completingIds.has(task.id)}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                        onTagsChange={handleTagsChange}
                        onTagCreated={handleTagCreated}
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
                allTags={allTags}
                isExiting={completingIds.has(task.id)}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onTagsChange={handleTagsChange}
                onTagCreated={handleTagCreated}
                onGroupCreated={(g) => setGroups((prev) => [...prev, g])}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
