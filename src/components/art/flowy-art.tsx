"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Flowy's own drawings, used where an emoji used to be: the brand gradient
 * (violet → pink → cyan), soft round shapes and four-point sparkles.
 */
export type ArtName = "celebrate" | "hello" | "rest";

function Sparkle({ x, y, size, fill, className }: { x: number; y: number; size: number; fill: string; className?: string }) {
  const s = size;
  return (
    <path
      className={className}
      d={`M${x} ${y - s} C${x + s * 0.15} ${y - s * 0.15} ${x + s * 0.15} ${y - s * 0.15} ${x + s} ${y} C${x + s * 0.15} ${y + s * 0.15} ${x + s * 0.15} ${y + s * 0.15} ${x} ${y + s} C${x - s * 0.15} ${y + s * 0.15} ${x - s * 0.15} ${y + s * 0.15} ${x - s} ${y} C${x - s * 0.15} ${y - s * 0.15} ${x - s * 0.15} ${y - s * 0.15} ${x} ${y - s}Z`}
      fill={fill}
    />
  );
}

export function FlowyArt({ name, className }: { name: ArtName; className?: string }) {
  const id = useId().replace(/:/g, "");
  const brand = `url(#${id}-brand)`;
  const soft = `url(#${id}-soft)`;

  return (
    <svg viewBox="0 0 120 120" className={cn("size-20", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-brand`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="0.55" stopColor="#ec4899" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id={`${id}-soft`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill={soft} />

      {name === "celebrate" ? (
        <>
          <circle cx="60" cy="62" r="30" fill={brand} className="flowy-art-pop" />
          <path d="M46 62 l10 10 l19 -21" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" className="flowy-art-draw" />
          <Sparkle x={24} y={30} size={8} fill="#c4b5fd" className="flowy-art-twinkle" />
          <Sparkle x={98} y={26} size={6} fill="#f9a8d4" className="flowy-art-twinkle [animation-delay:.3s]" />
          <Sparkle x={100} y={92} size={7} fill="#67e8f9" className="flowy-art-twinkle [animation-delay:.6s]" />
          <circle cx="20" cy="84" r="3.5" fill="#fbbf24" />
          <circle cx="88" cy="12" r="2.5" fill="#34d399" />
          <rect x="14" y="56" width="8" height="3.5" rx="1.75" fill="#f472b6" transform="rotate(-30 18 58)" />
          <rect x="102" y="58" width="8" height="3.5" rx="1.75" fill="#a78bfa" transform="rotate(35 106 60)" />
        </>
      ) : null}

      {name === "hello" ? (
        <>
          {/* The Flowy ribbons, waving. */}
          <g className="flowy-art-wave" style={{ transformOrigin: "60px 90px" }}>
            <rect x="34" y="34" width="52" height="18" rx="9" fill={brand} transform="rotate(-18 60 43)" />
            <rect x="34" y="58" width="52" height="18" rx="9" fill={brand} opacity="0.75" transform="rotate(-18 60 67)" />
          </g>
          <Sparkle x={96} y={30} size={8} fill="#f9a8d4" className="flowy-art-twinkle" />
          <Sparkle x={24} y={88} size={6} fill="#67e8f9" className="flowy-art-twinkle [animation-delay:.4s]" />
        </>
      ) : null}

      {name === "rest" ? (
        <>
          {/* Nothing left: a calm moon over a cleared line. */}
          <path d="M70 30 a28 28 0 1 0 22 42 a22 22 0 1 1 -22 -42Z" fill={brand} className="flowy-art-pop" />
          <path d="M28 90 h64" stroke="#a78bfa" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
          <Sparkle x={34} y={34} size={6} fill="#c4b5fd" className="flowy-art-twinkle" />
          <Sparkle x={96} y={86} size={5} fill="#67e8f9" className="flowy-art-twinkle [animation-delay:.5s]" />
        </>
      ) : null}
    </svg>
  );
}

/** Small inline spark used next to text instead of an emoji. */
export function SparkMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" className={cn("inline-block size-[1em] align-[-0.1em]", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <Sparkle x={12} y={12} size={10} fill={`url(#${id}-g)`} />
    </svg>
  );
}
