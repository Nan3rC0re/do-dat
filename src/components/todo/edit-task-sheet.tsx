"use client";

import { useState, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import TaskDatePicker from "./task-date-picker";
import PriorityPicker from "./priority-picker";
import TagPicker from "./tag-picker";
// import GroupPicker from "./group-picker"; // GROUPS — hidden until feature is re-enabled
import { updateTask } from "@/lib/actions/tasks";
import { setTaskTags } from "@/lib/actions/tags";
import { toast } from "sonner";
import type { TaskWithTags, Tag, Group, TaskPriority } from "@/lib/db/schema";

interface EditTaskSheetProps {
  task: TaskWithTags;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOptimisticUpdate: (title: string, dueDate: Date | null, groupId: string | null, priority: TaskPriority) => void;
  onTagsChange: (tagIds: string[]) => void;
  onTagCreated: (tag: Tag) => void;
  allTags: Tag[];
  groups?: Group[];
  onGroupCreated?: (group: Group) => void;
}

export default function EditTaskSheet({
  task,
  open,
  onOpenChange,
  onOptimisticUpdate,
  onTagsChange,
  onTagCreated,
  allTags,
  groups: _groups = [],
  onGroupCreated: _onGroupCreated,
}: EditTaskSheetProps) {
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState<Date | null>(task.dueDate ?? null);
  const [groupId] = useState<string | null>(task.groupId ?? null);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    task.tags.map((t) => t.id),
  );
  const [isPending, startTransition] = useTransition();

  // Keep local state in sync when task prop changes (sheet reopened for a different task)
  const taskId = task.id;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const newTitle = title.trim();
    onOptimisticUpdate(newTitle, dueDate, groupId, priority);
    onTagsChange(selectedTagIds);
    onOpenChange(false);

    startTransition(async () => {
      try {
        await updateTask({ taskId, title: newTitle, dueDate, groupId, priority });
        await setTaskTags({ taskId, tagIds: selectedTagIds });
      } catch {
        toast.error("Failed to update task");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-8 max-w-2xl w-full px-4 left-1/2 -translate-x-1/2 right-auto"
      >
        <SheetHeader className="mb-6">
          <SheetTitle>Edit task</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="h-11"
            autoFocus
          />
          <div className="flex items-center gap-2 flex-wrap">
            <TaskDatePicker value={dueDate} onChange={setDueDate} />
            <PriorityPicker value={priority} onChange={setPriority} />
            <TagPicker
              allTags={allTags}
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
              onTagCreated={onTagCreated}
            />
            {/* GROUP PICKER — hidden until groups feature is re-enabled */}
          </div>
          <Button
            type="submit"
            disabled={isPending || !title.trim()}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-white"
          >
            Save changes
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
