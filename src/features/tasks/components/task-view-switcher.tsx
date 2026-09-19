"use client";

import { Grid2x2, Columns3, List } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TaskView = "list" | "kanban" | "matrix";

function SwitcherInner({ activeView }: { activeView: TaskView }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    return params.toString();
  };

  const listHref = `${pathname}?${createQueryString("layout", "list")}`;
  const kanbanHref = `${pathname}?${createQueryString("layout", "kanban")}`;
  const matrixHref = `${pathname}?${createQueryString("layout", "matrix")}`;

  return (
    <div
      className="flex rounded-md border border-border bg-muted/40 p-1"
      role="group"
      aria-label="Visualização das tarefas"
    >
      <Link
        href={listHref}
        aria-current={activeView === "list" ? "page" : undefined}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "min-h-8 gap-1.5 px-2.5",
          activeView === "list" && "bg-background shadow-sm hover:bg-background",
        )}
      >
        <List className="size-3.5" aria-hidden="true" />
        Lista
      </Link>
      <Link
        href={kanbanHref}
        aria-current={activeView === "kanban" ? "page" : undefined}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "min-h-8 gap-1.5 px-2.5",
          activeView === "kanban" &&
            "bg-background shadow-sm hover:bg-background",
        )}
      >
        <Columns3 className="size-3.5" aria-hidden="true" />
        Kanban
      </Link>
      <Link
        href={matrixHref}
        aria-current={activeView === "matrix" ? "page" : undefined}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "min-h-8 gap-1.5 px-2.5",
          activeView === "matrix" &&
            "bg-background shadow-sm hover:bg-background",
        )}
      >
        <Grid2x2 className="size-3.5" aria-hidden="true" />
        Matriz
      </Link>
    </div>
  );
}

export function TaskViewSwitcher({ activeView }: { activeView: TaskView }) {
  return (
    <Suspense fallback={<div className="h-10 w-40 bg-muted rounded-md animate-pulse" />}>
      <SwitcherInner activeView={activeView} />
    </Suspense>
  );
}
