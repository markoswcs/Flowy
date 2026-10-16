"use client";

import { Grid2x2, Columns3, List } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TaskView = "list" | "kanban" | "matrix";

const views = [
  { value: "list", label: "Lista", icon: List },
  { value: "kanban", label: "Kanban", icon: Columns3 },
  { value: "matrix", label: "Matriz", icon: Grid2x2 },
] as const;

// Switching views is instant client state; the URL is only updated so a
// reload or shared link opens the same view.
export function TaskViewSwitcher({
  activeView,
  onChange,
}: {
  activeView: TaskView;
  onChange: (view: TaskView) => void;
}) {
  function select(view: TaskView) {
    onChange(view);
    const url = new URL(window.location.href);
    url.searchParams.set("layout", view);
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <div
      className="relative flex rounded-full border border-border bg-muted/40 p-1"
      role="group"
      aria-label="Visualização das tarefas"
    >
      {views.map(({ value, label, icon: Icon }) => {
        const active = activeView === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => select(value)}
            aria-pressed={active}
            aria-label={label}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "min-h-8 gap-1.5 rounded-full px-2.5 transition-all duration-300 max-[400px]:px-2",
              active && "bg-background text-foreground shadow-sm hover:bg-background",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            <span className="max-[400px]:sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
