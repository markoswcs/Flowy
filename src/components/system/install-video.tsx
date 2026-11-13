"use client";

import { useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

export type PhoneKind = "iphone" | "android";

export function phoneKind(userAgent: string): PhoneKind {
  return /iphone|ipad|ipod|macintosh/i.test(userAgent) && !/android/i.test(userAgent) ? "iphone" : "android";
}

const noop = () => () => {};

/**
 * The install tutorial video (scripts/install-video renders it): how to put
 * Flowy on the home screen and allow notifications, for iPhone and Android.
 */
export function InstallVideo({
  initial,
  className,
  compact = false,
}: {
  initial?: PhoneKind;
  className?: string;
  /** Inside a dialog: shorter, so the steps below still fit. */
  compact?: boolean;
}) {
  // The server renders iPhone; the browser then picks the phone it runs on.
  const detected = useSyncExternalStore(
    noop,
    () => phoneKind(navigator.userAgent),
    () => "iphone" as const,
  );
  const [chosen, setKind] = useState<PhoneKind | null>(initial ?? null);
  const kind = chosen ?? detected;

  return (
    <div className={cn("w-full", className)}>
      <div className="mx-auto mb-3 grid w-fit grid-cols-2 rounded-full border border-border/60 bg-muted/40 p-1 text-sm" role="tablist" aria-label="Seu celular">
        {(["iphone", "android"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={kind === value}
            onClick={() => setKind(value)}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium transition-colors",
              kind === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "iphone" ? "iPhone" : "Android"}
          </button>
        ))}
      </div>
      <video
        key={kind}
        className={cn(
          "mx-auto aspect-[9/16] w-auto max-w-full rounded-3xl bg-black shadow-xl ring-1 ring-border/60",
          compact ? "max-h-[46dvh]" : "max-h-[min(70vh,560px)]",
        )}
        src={`/videos/instalar-${kind}.mp4`}
        poster={`/videos/instalar-${kind}.jpg`}
        autoPlay
        muted
        loop
        playsInline
        controls
        preload="metadata"
        aria-label={`Vídeo: como instalar o Flowy no ${kind === "iphone" ? "iPhone" : "Android"} e ativar os lembretes`}
      />
    </div>
  );
}
