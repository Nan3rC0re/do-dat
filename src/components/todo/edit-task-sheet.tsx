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
import { updateTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import type { Task } from "@/lib/db/schema";

interface EditTaskSheetProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOptimisticUpdate: (title: string, dueDate: Date | null) => void;
}

export default function EditTaskSheet({
  task,
  open,
  onOpenChange,
  onOptimisticUpdate,
}: EditTaskSheetProps) {
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState<Date | null>(task.dueDate ?? null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onOptimisticUpdate(title.trim(), dueDate);
    onOpenChange(false);

    startTransition(async () => {
      try {
        await updateTask({ taskId: task.id, title: title.trim(), dueDate });
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
          <div className="flex items-center gap-2">
            <TaskDatePicker value={dueDate} onChange={setDueDate} />
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
