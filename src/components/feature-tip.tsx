"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useId, useSyncExternalStore, type ReactNode } from "react";

import { useIntroOffered } from "@/lib/intro-preferences";
import { cn } from "@/lib/utils";

/**
 * Thought bubbles that point at a new feature, one at a time, in this order.
 * "Entendi" retires that bubble; "Não lembrar mais" retires them all. Both are
 * kept on the account, so they hold on every device.
 */
const ORDER = [
  "treinos-serie",
  "treinos-anilhas",
  "treinos-planos",
  "treinos-progresso",
  "barra-segurar",
] as const;
export type TipId = (typeof ORDER)[number];

const ALL_OFF = "tips:off";

// Mounted bubbles that may show: id → instances, in mount order.
const mounted = new Map<TipId, string[]>();
const listeners = new Set<() => void>();
let snapshot: string | null = null;
// Retired in this session: a tip used in many places (one per exercise) must
// not come back on the next copy once the person said "Entendi".
const retired = new Set<string>();

function recompute() {
  const id = retired.has(ALL_OFF) ? undefined : ORDER.find((tip) => !retired.has(tip) && mounted.get(tip)?.length);
  const next = id ? `${id}|${mounted.get(id)![0]}` : null;
  if (next !== snapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
}

function register(id: TipId, instance: string) {
  mounted.set(id, [...(mounted.get(id) ?? []), instance]);
  recompute();
  return () => {
    mounted.set(
      id,
      (mounted.get(id) ?? []).filter((item) => item !== instance),
    );
    recompute();
  };
}

function useActive() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => null,
  );
}

/**
 * Wraps a feature and, while it is new to the person, shows a bubble with a
 * tail pointing at it. `side` is where the bubble sits; `align` keeps it on
 * screen near the edges.
 */
export function FeatureTip({
  id,
  title,
  text,
  side = "top",
  align = "center",
  className,
  children,
}: {
  id: TipId;
  title: string;
  text: string;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  className?: string;
  children: ReactNode;
}) {
  const instance = useId();
  const [offered, dismissOne] = useIntroOffered(`tip:${id}`);
  const [allOffered, dismissEvery] = useIntroOffered(ALL_OFF);
  const dismiss = () => {
    retired.add(id);
    recompute();
    dismissOne();
  };
  const dismissAll = () => {
    retired.add(ALL_OFF);
    recompute();
    dismissEvery();
  };
  const eligible = offered === true && allOffered === true;
  const active = useActive();

  useEffect(
    () => (eligible ? register(id, instance) : undefined),
    [eligible, id, instance],
  );

  const showing = eligible && active === `${id}|${instance}`;

  return (
    <div className={cn("relative", className)}>
      {children}
      {showing ? (
        <div
          role="dialog"
          aria-label={`Novidade: ${title}`}
          className={cn(
            "absolute z-50 w-[min(17rem,calc(100vw-2rem))]",
            side === "top"
              ? "bottom-[calc(100%+0.75rem)]"
              : "top-[calc(100%+0.75rem)]",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "start" && "left-0",
            align === "end" && "right-0",
          )}
        >
          {/* Animated inside, so the entrance does not fight the centring transform. */}
          <div
            className={cn(
              "flowy-tip-bubble relative rounded-2xl p-3.5 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-300",
              side === "top" ? "slide-in-from-bottom-2" : "slide-in-from-top-2",
            )}
          >
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles
                className="size-4 shrink-0 text-violet-300"
                aria-hidden="true"
              />
              {title}
            </p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
              {text}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={dismissAll}
                className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Não lembrar mais
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Entendi
              </button>
            </div>
            {/* The tail, pointing at the feature. */}
            <span
              aria-hidden="true"
              className={cn(
                "flowy-tip-tail absolute size-3.5 rotate-45",
                side === "top"
                  ? "-bottom-[7px] border-b border-r"
                  : "-top-[7px] border-l border-t",
                align === "center" && "left-1/2 -translate-x-1/2",
                align === "start" && "left-5",
                align === "end" && "right-5",
              )}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
