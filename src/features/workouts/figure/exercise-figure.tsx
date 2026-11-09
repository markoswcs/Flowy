"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

import { FIGURES } from "./figures";
import { GROUND, VIEW_BOX, jointsAt, type FigureSpec, type Joints, type Pt, type PropShape } from "./model";

const PERIOD = 2600;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia?.(REDUCED_MOTION);
  query?.addEventListener?.("change", onChange);
  return () => query?.removeEventListener?.("change", onChange);
}

/** People who turned animations off see the start and the end side by side. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia?.(REDUCED_MOTION).matches === true,
    () => false,
  );
}

/** 0 → 1 → 0 smoothly while the drawing is on screen. */
function useMoving(active: boolean) {
  const ref = useRef<SVGSVGElement>(null);
  const [t, setT] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!active || !node) return;
    let frame = 0;
    let visible = true;
    const start = performance.now();
    const tick = (now: number) => {
      if (visible) {
        const phase = ((now - start) % PERIOD) / PERIOD;
        setT(0.5 - 0.5 * Math.cos(phase * 2 * Math.PI));
      }
      frame = requestAnimationFrame(tick);
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? true;
          });
    observer?.observe(node);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [active]);
  return { ref, t };
}

const path = (points: Pt[]) => points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");

function Prop({ shape }: { shape: PropShape }) {
  if (shape.kind === "line") {
    return <path d={path(shape.points)} strokeWidth={shape.width ?? 2.5} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />;
  }
  if (shape.kind === "curve") {
    const [from, via, to] = [shape.from, shape.via, shape.to];
    return (
      <path
        d={`M${from[0]} ${from[1]} Q${via[0]} ${via[1]} ${to[0]} ${to[1]}`}
        strokeWidth={shape.width ?? 2}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
      />
    );
  }
  return (
    <circle
      cx={shape.at[0]}
      cy={shape.at[1]}
      r={shape.r}
      fill={shape.filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={shape.filled ? 0 : 2.5}
    />
  );
}

function Body({ j, gradient }: { j: Joints; gradient: string }) {
  const far = { stroke: "#7c3aed", strokeOpacity: 0.45 };
  const near = { stroke: `url(#${gradient})` };
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={path([j.shoulder2, j.elbow2, j.hand2])} strokeWidth={5} {...far} />
      <path d={path([j.hip2, j.knee2, j.ankle2, j.toe2])} strokeWidth={6} {...far} />
      <path d={path([j.hip, j.knee, j.ankle, j.toe])} strokeWidth={6} {...near} />
      <path d={path([[(j.hip[0] + j.hip2[0]) / 2, (j.hip[1] + j.hip2[1]) / 2], [(j.shoulder[0] + j.shoulder2[0]) / 2, (j.shoulder[1] + j.shoulder2[1]) / 2]])} strokeWidth={9} {...near} />
      <circle cx={j.head[0]} cy={j.head[1]} r={5.2} fill={`url(#${gradient})`} stroke="none" />
      <path d={path([j.shoulder, j.elbow, j.hand])} strokeWidth={5} stroke="#c4b5fd" />
    </g>
  );
}

export function Frame({ spec, t, label, svgRef }: { spec: FigureSpec; t: number; label: string; svgRef?: React.Ref<SVGSVGElement> }) {
  const id = useId().replace(/:/g, "");
  const joints = jointsAt(spec, t);
  const props = spec.props?.(joints, t) ?? [];
  return (
    <svg
      ref={svgRef}
      viewBox={`${VIEW_BOX.x} ${VIEW_BOX.y} ${VIEW_BOX.width} ${VIEW_BOX.height}`}
      role="img"
      aria-label={label}
      className="h-full w-full"
    >
      <defs>
        <linearGradient id={`b${id}`} gradientUnits="userSpaceOnUse" x1="20" y1="-8" x2="100" y2="88">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <radialGradient id={`g${id}`} cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={VIEW_BOX.x} y={VIEW_BOX.y} width={VIEW_BOX.width} height={VIEW_BOX.height} fill={`url(#g${id})`} />
      <line x1={4} x2={116} y1={GROUND + 0.5} y2={GROUND + 0.5} stroke="currentColor" strokeOpacity={0.25} strokeWidth={1} />
      <g className="text-muted-foreground" opacity={0.7}>
        {props.filter((shape) => !shape.front).map((shape, index) => (
          <Prop key={index} shape={shape} />
        ))}
      </g>
      <Body j={joints} gradient={`b${id}`} />
      <g className="text-muted-foreground" opacity={0.85}>
        {props.filter((shape) => shape.front).map((shape, index) => (
          <Prop key={index} shape={shape} />
        ))}
      </g>
    </svg>
  );
}

export function hasFigure(exerciseId: string) {
  return exerciseId in FIGURES;
}

/**
 * How the exercise is done: the move playing in a loop, or, for people who
 * turned animations off, the start and the end side by side.
 */
export function ExerciseFigure({
  exerciseId,
  name,
  still = false,
  className,
}: {
  exerciseId: string;
  name: string;
  /** A small, fixed picture (lists): the end of the move. */
  still?: boolean;
  className?: string;
}) {
  const spec = FIGURES[exerciseId];
  const reduced = usePrefersReducedMotion();
  const animate = Boolean(spec) && !still && !reduced;
  const { ref, t } = useMoving(animate);
  if (!spec) return null;

  if (still) {
    return (
      <div className={cn("aspect-[5/4] overflow-hidden rounded-xl bg-muted/30", className)}>
        <Frame spec={spec} t={1} label={name} />
      </div>
    );
  }

  if (!animate) {
    return (
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        {(["Começo", "Fim"] as const).map((label, index) => (
          <figure key={label} className="overflow-hidden rounded-2xl bg-muted/30">
            <div className="aspect-[5/4]">
              <Frame spec={spec} t={index} label={`${name}: ${label.toLowerCase()} do movimento`} />
            </div>
            <figcaption className="pb-1.5 text-center text-[11px] font-medium text-muted-foreground">{label}</figcaption>
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("aspect-[5/4] overflow-hidden rounded-2xl bg-muted/30", className)}>
      <Frame spec={spec} t={t} label={`${name}: o movimento`} svgRef={ref} />
    </div>
  );
}
