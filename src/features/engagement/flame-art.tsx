"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

import { levelOf } from "./streak-levels";

/** Colours and effects of the flame at each level (index = LEVELS index). */
const LOOKS = [
  // Começando: a cold ember.
  {
    outer: ["#64748b", "#334155"],
    inner: ["#94a3b8", "#64748b"],
    glow: "#64748b",
    embers: 0,
    sparkles: 0,
    texture: false,
    halo: false,
  },
  // Faísca: a small yellow spark.
  {
    outer: ["#fde047", "#f59e0b"],
    inner: ["#fffbeb", "#fde68a"],
    glow: "#fbbf24",
    embers: 1,
    sparkles: 0,
    texture: false,
    halo: false,
  },
  // Chama: a proper orange flame.
  {
    outer: ["#fdba74", "#ea580c"],
    inner: ["#fef3c7", "#fbbf24"],
    glow: "#fb923c",
    embers: 2,
    sparkles: 0,
    texture: false,
    halo: false,
  },
  // Fogueira: tall, two-tone, embers rising.
  {
    outer: ["#fb923c", "#dc2626"],
    inner: ["#fef08a", "#f97316"],
    glow: "#f97316",
    embers: 4,
    sparkles: 0,
    texture: true,
    halo: false,
  },
  // Vulcão: deep red with a molten texture and strong heat.
  {
    outer: ["#f87171", "#7f1d1d"],
    inner: ["#fde68a", "#ef4444"],
    glow: "#ef4444",
    embers: 6,
    sparkles: 0,
    texture: true,
    halo: false,
  },
  // Lenda: a cosmic violet-blue flame with sparkles and a halo.
  {
    outer: ["#c084fc", "#4f46e5"],
    inner: ["#e0f2fe", "#22d3ee"],
    glow: "#a855f7",
    embers: 4,
    sparkles: 5,
    texture: true,
    halo: true,
  },
];

const OUTER =
  "M32 4 C 36 16, 52 22, 50 40 C 49 52, 41 60, 32 60 C 23 60, 14 53, 14 41 C 14 30, 22 26, 24 16 C 28 22, 30 24, 31 26 C 33 18, 33 11, 32 4 Z";
const INNER =
  "M32 26 C 35 33, 43 37, 42 46 C 41 53, 37 56, 32 56 C 27 56, 22 52, 22 46 C 22 40, 27 37, 28 31 C 30 35, 31 36, 32 37 C 33 33, 33 30, 32 26 Z";

/**
 * The streak flame. It grows with the streak: colour, texture, glow, embers
 * and, at the top level, sparkles and a halo. Animations move only transform
 * and opacity, so phones play them smoothly.
 */
export function FlameArt({
  days,
  size = 48,
  frozen = false,
  className,
}: {
  days: number;
  size?: number;
  frozen?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const level = levelOf(days);
  const index = Math.max(
    0,
    ["Começando", "Faísca", "Chama", "Fogueira", "Vulcão", "Lenda"].indexOf(
      level.name,
    ),
  );
  const look = frozen
    ? {
        outer: ["#bae6fd", "#0284c7"],
        inner: ["#f0f9ff", "#7dd3fc"],
        glow: "#38bdf8",
        embers: 0,
        sparkles: 3,
        texture: false,
        halo: false,
      }
    : LOOKS[index]!;
  const alive = days > 0 && !frozen;

  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Heat glow behind the flame, stronger at higher levels. */}
      <span
        className={cn(
          "absolute inset-0 rounded-full blur-md",
          alive && "flowy-flame-glow",
        )}
        style={{
          background: `radial-gradient(circle, ${look.glow}${index >= 3 ? "aa" : "66"}, transparent 70%)`,
        }}
      />
      {look.halo ? (
        <span
          className="flowy-flame-halo absolute inset-[-10%] rounded-full border-2"
          style={{ borderColor: `${look.glow}88` }}
        />
      ) : null}
      <svg
        viewBox="0 0 64 64"
        className={cn("relative h-full w-full", alive && "flowy-flame-dance")}
      >
        <defs>
          <linearGradient id={`${id}-o`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={look.outer[0]} />
            <stop offset="1" stopColor={look.outer[1]} />
          </linearGradient>
          <linearGradient id={`${id}-i`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={look.inner[0]} />
            <stop offset="1" stopColor={look.inner[1]} />
          </linearGradient>
          {look.texture ? (
            <pattern
              id={`${id}-t`}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(35)"
            >
              <rect width="6" height="6" fill="transparent" />
              <rect width="2" height="6" fill="#000" opacity="0.16" />
            </pattern>
          ) : null}
        </defs>
        <path d={OUTER} fill={`url(#${id}-o)`} />
        {look.texture ? <path d={OUTER} fill={`url(#${id}-t)`} /> : null}
        <path
          d={INNER}
          fill={`url(#${id}-i)`}
          className={alive ? "flowy-flame-core" : undefined}
        />
        {frozen ? (
          <path
            d="M20 40 L44 40 M32 28 L32 52 M24 32 L40 48 M40 32 L24 48"
            stroke="#f0f9ff"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.8"
          />
        ) : null}
      </svg>
      {Array.from({ length: alive ? look.embers : 0 }, (_, ember) => (
        <span
          key={`e${ember}`}
          className="flowy-flame-ember absolute rounded-full"
          style={{
            width: Math.max(2, size * 0.06),
            height: Math.max(2, size * 0.06),
            left: `${30 + ((ember * 37) % 40)}%`,
            bottom: "30%",
            backgroundColor: look.inner[1],
            animationDelay: `${ember * 0.45}s`,
          }}
        />
      ))}
      {Array.from({ length: look.sparkles }, (_, sparkle) => (
        <span
          key={`s${sparkle}`}
          className="flowy-flame-sparkle absolute"
          style={{
            left: `${[8, 82, 16, 74, 48][sparkle]}%`,
            top: `${[18, 26, 70, 66, -4][sparkle]}%`,
            width: size * 0.14,
            height: size * 0.14,
            backgroundColor: frozen ? "#e0f2fe" : "#f5f3ff",
            animationDelay: `${sparkle * 0.5}s`,
          }}
        />
      ))}
    </span>
  );
}
