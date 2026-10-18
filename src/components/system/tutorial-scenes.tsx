import type { CSSProperties, ReactNode } from "react";

/**
 * Tiny looping SVG animations used by tutorials. Motion lives in globals.css
 * (`.tut-*` classes) and stops for "Reduzir animações" / reduced motion,
 * leaving the final, fully drawn frame.
 */
export type SceneId =
  | "typing"
  | "checklist"
  | "toolbar"
  | "image"
  | "organize"
  | "branches"
  | "tap"
  | "drag"
  | "palette"
  | "link"
  | "search"
  | "shapes"
  | "pen"
  | "install"
  | "bell"
  | "devices"
  | "done";

const P = "hsl(var(--primary))";
const MUTED = "hsl(var(--muted-foreground) / 0.45)";
const CARD = "hsl(var(--card))";
const LINE = "hsl(var(--foreground) / 0.18)";

function d(seconds: number): CSSProperties {
  return { animationDelay: `${seconds}s` };
}

function Node({
  x,
  y,
  w = 46,
  h = 18,
  fill = CARD,
  className,
  style,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  fill?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <rect
      x={x - w / 2}
      y={y - h / 2}
      width={w}
      height={h}
      rx={6}
      fill={fill}
      stroke={LINE}
      className={className}
      style={style}
    />
  );
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <g>
      <rect
        x="70"
        y="6"
        width="60"
        height="108"
        rx="12"
        fill={CARD}
        stroke={LINE}
        strokeWidth="2"
      />
      <rect x="90" y="11" width="20" height="4" rx="2" fill={LINE} />
      {children}
    </g>
  );
}

const SCENES: Record<SceneId, () => ReactNode> = {
  typing: () => (
    <>
      <rect
        x="40"
        y="14"
        width="120"
        height="92"
        rx="10"
        fill={CARD}
        stroke={LINE}
      />
      <rect
        x="54"
        y="28"
        width="62"
        height="8"
        rx="4"
        fill={P}
        className="tut-grow-x"
      />
      {[46, 58, 70].map((y, i) => (
        <rect
          key={y}
          x="54"
          y={y}
          width={i === 2 ? 56 : 92}
          height="5"
          rx="2.5"
          fill={MUTED}
          className="tut-grow-x"
          style={d(0.5 + i * 0.45)}
        />
      ))}
      <rect
        x="112"
        y="68"
        width="2"
        height="9"
        fill={P}
        className="tut-blink"
      />
    </>
  ),
  checklist: () => (
    <>
      <rect
        x="40"
        y="14"
        width="120"
        height="92"
        rx="10"
        fill={CARD}
        stroke={LINE}
      />
      {[34, 60, 86].map((y, i) => (
        <g key={y}>
          <circle
            cx="60"
            cy={y}
            r="7"
            fill="none"
            stroke={MUTED}
            strokeWidth="2"
          />
          <circle
            cx="60"
            cy={y}
            r="7"
            fill={P}
            className="tut-pop"
            style={d(0.4 + i * 0.6)}
          />
          <path
            d={`M56.5 ${y} l2.5 2.5 l5 -5`}
            stroke="#fff"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            className="tut-pop"
            style={d(0.4 + i * 0.6)}
          />
          <rect
            x="74"
            y={y - 3}
            width={i === 1 ? 50 : 68}
            height="6"
            rx="3"
            fill={MUTED}
            className="tut-dim"
            style={d(0.4 + i * 0.6)}
          />
        </g>
      ))}
    </>
  ),
  toolbar: () => (
    <>
      <rect
        x="30"
        y="74"
        width="140"
        height="28"
        rx="14"
        fill={CARD}
        stroke={LINE}
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={44 + i * 24}
          y="82"
          width="12"
          height="12"
          rx="3"
          fill={MUTED}
        />
      ))}
      <rect
        x="40"
        y="78"
        width="20"
        height="20"
        rx="7"
        fill="none"
        stroke={P}
        strokeWidth="2"
        className="tut-hop"
      />
      <rect x="50" y="20" width="100" height="8" rx="4" fill={MUTED} />
      <rect
        x="50"
        y="36"
        width="70"
        height="8"
        rx="4"
        fill={P}
        className="tut-pulse"
      />
    </>
  ),
  image: () => (
    <>
      <rect
        x="40"
        y="14"
        width="120"
        height="92"
        rx="10"
        fill={CARD}
        stroke={LINE}
      />
      <g className="tut-pop-in">
        <rect
          x="58"
          y="30"
          width="84"
          height="58"
          rx="8"
          fill={P}
          opacity="0.18"
          stroke={P}
        />
        <circle cx="76" cy="46" r="7" fill={P} />
        <path
          d="M62 84 L88 58 L104 72 L116 62 L138 84 Z"
          fill={P}
          opacity="0.7"
        />
      </g>
    </>
  ),
  organize: () => (
    <>
      <path d="M58 70 h28 l6 7 h50 v31 h-84 z" fill={P} opacity="0.85" />
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={70 + i * 22}
          y="14"
          width="18"
          height="24"
          rx="4"
          fill={CARD}
          stroke={LINE}
          className="tut-drop-in"
          style={d(i * 0.45)}
        />
      ))}
    </>
  ),
  branches: () => (
    <>
      {[
        "M100 60 C125 60 125 26 150 26",
        "M100 60 C125 60 125 94 150 94",
        "M100 60 C75 60 75 26 50 26",
        "M100 60 C75 60 75 94 50 94",
      ].map((path, i) => (
        <path
          key={path}
          d={path}
          fill="none"
          stroke={P}
          strokeWidth="2.5"
          pathLength={1}
          className="tut-draw"
          style={d(0.3 + i * 0.35)}
        />
      ))}
      {[
        [150, 26],
        [150, 94],
        [50, 26],
        [50, 94],
      ].map(([x, y], i) => (
        <Node
          key={i}
          x={x!}
          y={y!}
          w={38}
          className="tut-pop"
          style={d(0.8 + i * 0.35)}
        />
      ))}
      <Node x={100} y={60} w={54} h={22} fill={P} />
    </>
  ),
  tap: () => (
    <>
      <Node x={100} y={56} w={80} h={26} />
      <rect x="72" y="52" width="40" height="7" rx="3.5" fill={MUTED} />
      <rect
        x="114"
        y="49"
        width="2"
        height="13"
        fill={P}
        className="tut-blink"
        style={d(1.2)}
      />
      <circle
        cx="128"
        cy="74"
        r="10"
        fill={P}
        opacity="0.35"
        className="tut-ripple"
      />
      <circle cx="128" cy="74" r="5" fill={P} />
    </>
  ),
  drag: () => (
    <>
      <Node x={60} y={60} w={50} h={20} fill="none" className="tut-ghost" />
      <g className="tut-slide-x">
        <Node x={60} y={60} w={50} h={20} fill={P} />
        <circle
          cx="74"
          cy="72"
          r="5"
          fill="hsl(var(--foreground))"
          opacity="0.8"
        />
      </g>
    </>
  ),
  palette: () => (
    <>
      <rect
        x="64"
        y="44"
        width="72"
        height="30"
        rx="9"
        className="tut-colors"
      />
      {["#F43F5E", "#F59E0B", "#22C55E", "#3B82F6", "#8B5CF6"].map((c, i) => (
        <circle key={c} cx={68 + i * 16} cy="96" r="6" fill={c} />
      ))}
    </>
  ),
  link: () => (
    <>
      <Node x={52} y={34} w={50} />
      <Node x={148} y={86} w={50} />
      <path
        d="M78 36 C126 30 132 56 136 76"
        fill="none"
        stroke={P}
        strokeWidth="2.5"
        pathLength={1}
        className="tut-draw"
      />
      <path
        d="M131 72 l6 6 l3 -8"
        fill="none"
        stroke={P}
        strokeWidth="2.5"
        strokeLinecap="round"
        className="tut-pop"
        style={d(1.1)}
      />
    </>
  ),
  search: () => (
    <>
      <Node x={60} y={36} w={44} />
      <Node x={140} y={36} w={44} />
      <Node x={100} y={86} w={44} className="tut-flash" />
      <g className="tut-lens">
        <circle cx="0" cy="0" r="12" fill="none" stroke={P} strokeWidth="3" />
        <path
          d="M9 9 l10 10"
          stroke={P}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    </>
  ),
  shapes: () => (
    <>
      <rect
        x="28"
        y="44"
        width="46"
        height="30"
        rx="5"
        fill="none"
        stroke={P}
        strokeWidth="2.5"
        pathLength={1}
        className="tut-draw"
      />
      <path
        d="M78 59 h30"
        stroke={P}
        strokeWidth="2.5"
        pathLength={1}
        className="tut-draw"
        style={d(0.6)}
      />
      <path
        d="M102 53 l7 6 l-7 6"
        fill="none"
        stroke={P}
        strokeWidth="2.5"
        className="tut-pop"
        style={d(1)}
      />
      <path
        d="M142 38 L168 59 L142 80 L116 59 Z"
        fill="none"
        stroke={P}
        strokeWidth="2.5"
        pathLength={1}
        className="tut-draw"
        style={d(1.1)}
      />
    </>
  ),
  pen: () => (
    <>
      <rect
        x="40"
        y="14"
        width="120"
        height="92"
        rx="10"
        fill={CARD}
        stroke={LINE}
      />
      <path
        d="M56 78 C70 40 82 40 86 62 S102 86 110 56 S128 34 142 60"
        fill="none"
        stroke={P}
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={1}
        className="tut-draw"
      />
    </>
  ),
  install: () => (
    <Phone>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={78 + (i % 3) * 16}
          y={26 + Math.floor(i / 3) * 18}
          width="11"
          height="11"
          rx="3"
          fill={MUTED}
        />
      ))}
      <g className="tut-drop-in" style={d(0.6)}>
        <rect x="110" y="44" width="11" height="11" rx="3" fill={P} />
        <path
          d="M113 48 h5 M113 51 h3"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <g className="tut-pulse">
        <rect
          x="88"
          y="92"
          width="24"
          height="14"
          rx="7"
          fill={P}
          opacity="0.2"
        />
        <path
          d="M100 95 v7 M97 98 l3 -3 l3 3"
          stroke={P}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </Phone>
  ),
  bell: () => (
    <Phone>
      <g className="tut-slide-down">
        <rect
          x="74"
          y="20"
          width="52"
          height="20"
          rx="6"
          fill={P}
          opacity="0.95"
        />
        <rect x="79" y="26" width="26" height="3" rx="1.5" fill="#fff" />
        <rect
          x="79"
          y="32"
          width="38"
          height="3"
          rx="1.5"
          fill="#fff"
          opacity="0.7"
        />
      </g>
      <g className="tut-swing" style={{ transformOrigin: "100px 62px" }}>
        <path d="M90 84 v-12 a10 10 0 0 1 20 0 v12 l4 4 h-28 z" fill={P} />
        <circle cx="100" cy="92" r="3" fill={P} />
      </g>
    </Phone>
  ),
  devices: () => (
    <>
      <rect
        x="14"
        y="16"
        width="112"
        height="72"
        rx="8"
        fill={CARD}
        stroke={LINE}
        strokeWidth="2"
      />
      <path
        d="M58 96 h24 M70 88 v8"
        stroke={LINE}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g className="tut-slide-down">
        <rect x="64" y="24" width="56" height="18" rx="5" fill={P} />
        <rect x="69" y="29" width="28" height="3" rx="1.5" fill="#fff" />
        <rect
          x="69"
          y="35"
          width="40"
          height="3"
          rx="1.5"
          fill="#fff"
          opacity="0.7"
        />
      </g>
      <rect
        x="136"
        y="30"
        width="48"
        height="80"
        rx="10"
        fill={CARD}
        stroke={LINE}
        strokeWidth="2"
      />
      <g className="tut-slide-down" style={d(0.5)}>
        <rect x="140" y="40" width="40" height="15" rx="4" fill={P} />
        <rect x="144" y="45" width="22" height="2.5" rx="1.25" fill="#fff" />
      </g>
      <g className="tut-swing" style={{ transformOrigin: "160px 70px" }}>
        <path d="M152 92 v-9 a8 8 0 0 1 16 0 v9 l3 3 h-22 z" fill={P} />
      </g>
    </>
  ),
  done: () => (
    <>
      <circle cx="100" cy="60" r="34" fill={P} className="tut-pop" />
      <path
        d="M86 61 l10 10 l20 -22"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="tut-draw"
        style={d(0.3)}
      />
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <circle
          key={angle}
          cx={100 + 48 * Math.cos((angle * Math.PI) / 180)}
          cy={60 + 48 * Math.sin((angle * Math.PI) / 180)}
          r="3.5"
          fill={P}
          className="tut-pop"
          style={d(0.5 + i * 0.08)}
        />
      ))}
    </>
  ),
};

export function TutorialScene({ id }: { id: SceneId }) {
  return (
    <svg
      viewBox="0 0 200 120"
      className="tut-scene h-36 w-full max-w-[18rem]"
      role="img"
      aria-hidden="true"
    >
      {SCENES[id]()}
    </svg>
  );
}
