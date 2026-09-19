"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskEditor } from "@/features/tasks/components/task-item";
import { cn } from "@/lib/utils";
import type { Category, Folder as FolderType, Task } from "@/types/productivity";

interface TaskCalendarProps {
  tasks: Task[] | undefined;
  folders: FolderType[];
  categories: Category[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function TaskCalendar({
  tasks,
  folders,
  categories,
  loading = false,
  error,
  onRetry,
}: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar logic
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];
  
  // Previous month trailing days
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push({
      date: new Date(year, month - 1, daysInPrevMonth - firstDayOfMonth + i + 1),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // Next month leading days (to fill 42 cells usually)
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  const monthName = currentDate.toLocaleString("pt-BR", { month: "long" });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  if (loading) {
    return (
      <div className="rounded-3xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm animate-pulse">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-8 w-40 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="size-8 rounded-xl" />
            <Skeleton className="size-8 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 42 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center">
        <RotateCcw className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Não foi possível carregar as tarefas.</p>
        {onRetry && (
          <Button className="mt-4" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border/50 bg-card/40 p-2 sm:p-6 shadow-sm backdrop-blur-sm animate-fade-in">
      <div className="mb-6 flex items-center justify-between px-2">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {capitalizedMonthName} {year}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="rounded-xl border-border/50 bg-background/50 backdrop-blur hover:bg-background">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="rounded-xl border-border/50 bg-background/50 backdrop-blur hover:bg-background">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-4">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            {day}
          </div>
        ))}
        
        {days.map((day, idx) => {
          const isToday =
            day.date.getDate() === today.getDate() &&
            day.date.getMonth() === today.getMonth() &&
            day.date.getFullYear() === today.getFullYear();

          const dateStr = day.date.toISOString().split("T")[0];
          
          const dayTasks = (tasks || []).filter(t => t.due_date === dateStr);

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[80px] sm:min-h-[120px] rounded-2xl border p-1 sm:p-2 transition-all flex flex-col",
                day.isCurrentMonth
                  ? "bg-background/40 border-border/50"
                  : "bg-muted/10 border-transparent opacity-50",
                isToday && "ring-2 ring-primary border-primary bg-primary/5 shadow-sm",
                "hover:border-primary/40 hover:bg-background"
              )}
            >
              <div className="flex justify-between items-start mb-1 sm:mb-2 px-1">
                <span className={cn(
                  "text-xs sm:text-sm font-semibold flex size-5 sm:size-7 items-center justify-center rounded-full",
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                )}>
                  {day.date.getDate()}
                </span>
              </div>
              
              <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
                {dayTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setEditingTask(task)}
                    className={cn(
                      "w-full text-left truncate rounded-lg px-1.5 py-1 text-[10px] sm:text-xs font-medium transition-colors hover:opacity-80 active:scale-95",
                      task.status === "completed" 
                        ? "bg-muted text-muted-foreground line-through" 
                        : "bg-primary/10 text-primary border border-primary/20"
                    )}
                  >
                    {task.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-border/50 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-4 text-lg font-bold">Editar Tarefa</h3>
            <TaskEditor
              task={editingTask}
              folders={folders}
              categories={categories}
              onClose={() => setEditingTask(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
