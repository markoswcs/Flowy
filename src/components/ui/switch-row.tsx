"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A settings row that toggles on tap: icon, title, description and a switch.
 * The switch uses the brand violet so it stays visible in every theme
 * (the black themes' primary colour is white).
 */
export function SwitchRow({
  icon,
  title,
  description,
  checked,
  disabled,
  onToggle,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className="mt-4 flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-card/50 p-4 text-left transition-all hover:border-violet-400/40 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 disabled:cursor-not-allowed disabled:opacity-60 sm:p-5"
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-2xl transition-colors",
          checked ? "bg-violet-500/15 text-violet-400" : "bg-muted text-muted-foreground",
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-snug">{title}</span>
        <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-[1.75rem] w-[3.1rem] shrink-0 rounded-full p-[3px] transition-colors duration-300",
          checked ? "bg-violet-500" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "block size-[1.375rem] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.35)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            checked ? "translate-x-[1.35rem]" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
