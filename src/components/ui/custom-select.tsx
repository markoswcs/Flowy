"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  color?: string | null;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  triggerIcon?: ReactNode;
  className?: string;
  containerClassName?: string;
  onOpenChange?: (open: boolean) => void;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  triggerIcon,
  className,
  containerClassName,
  onOpenChange,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        handleOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onOpenChange]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={cn("relative", containerClassName)} ref={containerRef}>
      <button
        type="button"
        onClick={() => handleOpenChange(!open)}
        className={cn(
          "relative flex h-8 w-full min-w-[130px] max-w-full cursor-pointer items-center justify-between rounded-xl border border-border/50 bg-muted/20 backdrop-blur-lg px-3 text-xs font-medium text-foreground transition-all hover:bg-muted/40 focus:border-primary focus:bg-background/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 shadow-sm",
          className
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {triggerIcon && (
            <span className="text-muted-foreground">{triggerIcon}</span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "ml-2 size-3 shrink-0 text-muted-foreground transition-transform duration-200",
            open ? "rotate-180" : ""
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[100] mt-1.5 w-[200px] min-w-full overflow-hidden rounded-xl border border-border/50 bg-popover/60 p-1 shadow-xl backdrop-blur-2xl animate-in fade-in zoom-in-95 slide-in-from-top-2">
          <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  handleOpenChange(false);
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent",
                  value === option.value ? "bg-accent/50" : ""
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  {option.icon}
                  <span className="truncate">{option.label}</span>
                </div>
                {value === option.value && <Check className="size-3 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
