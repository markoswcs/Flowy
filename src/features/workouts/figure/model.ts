/**
 * The drawings of "Como fazer": a simple figure in the Flowy colors, drawn from
 * a few numbers per pose instead of image files, so all the exercises weigh a
 * few kilobytes and look the same in light and dark mode.
 *
 * Angles are in degrees and absolute: 0 points down, 90 forward (the figure
 * faces right), 180 up and 270 back. Lengths are in the units of the drawing
 * (120 × 96, ground at y = 84).
 */
export type Pt = [number, number];

/** A limb by its two angles, by where its end must be (world) or by where it must be from its root. */
export type Limb = [number, number] | { to: Pt; bend?: 1 | -1 } | { rel: Pt; bend?: 1 | -1 };

export interface Pose {
  hip: Pt;
  torso: number;
  /** Direction of the neck; the torso's when left out. */
  head?: number;
  /** Near arm (in front) and far arm (behind); the far one copies the near one when left out. */
  arm?: Limb;
  arm2?: Limb;
  leg?: Limb;
  leg2?: Limb;
  /** Direction of each foot, from the ankle to the toes. */
  toe?: number;
  toe2?: number;
}

export type PropShape =
  | { kind: "line"; points: Pt[]; width?: number; front?: boolean }
  | { kind: "circle"; at: Pt; r: number; front?: boolean; filled?: boolean }
  | { kind: "curve"; from: Pt; via: Pt; to: Pt; width?: number; front?: boolean };

export interface Joints {
  hip: Pt;
  hip2: Pt;
  shoulder: Pt;
  shoulder2: Pt;
  head: Pt;
  elbow: Pt;
  hand: Pt;
  elbow2: Pt;
  hand2: Pt;
  knee: Pt;
  ankle: Pt;
  toe: Pt;
  knee2: Pt;
  ankle2: Pt;
  toe2: Pt;
}

export interface FigureSpec {
  /** "front" spreads the limbs to the sides (jumping jacks, lateral raises). */
  view?: "side" | "front";
  poses: [Pose, Pose];
  /** Equipment, from the current joints and how far the move is (0 → 1). */
  props?: (now: Joints, t: number) => PropShape[];
}

export const VIEW_BOX = { x: 0, y: -8, width: 120, height: 96 } as const;
export const GROUND = 84;
/** Where an ankle rests on the ground (the limbs are 6 units thick). */
export const FLOOR = GROUND - 3;

export const LENGTH = { torso: 22, neck: 8, head: 5, upper: 12, fore: 11, thigh: 17, shin: 17, foot: 5 } as const;

const rad = (degrees: number) => (degrees * Math.PI) / 180;
const dir = (degrees: number): Pt => [Math.sin(rad(degrees)), Math.cos(rad(degrees))];
const add = (a: Pt, b: Pt, scale = 1): Pt => [a[0] + b[0] * scale, a[1] + b[1] * scale];

/** Two-bone reach: where the middle joint goes so the end lands on (or points at) the target. */
function reach(root: Pt, target: Pt, first: number, second: number, bend: 1 | -1): [Pt, Pt] {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return [add(root, [0, 1], first), add(root, [0, 1], first - second)];
  const ux = dx / distance;
  const uy = dy / distance;
  const span = Math.min(Math.max(distance, Math.abs(first - second) + 0.01), first + second - 0.01);
  const cos = Math.min(1, Math.max(-1, (first * first + span * span - second * second) / (2 * first * span)));
  const angle = Math.acos(cos) * (bend === 1 ? -1 : 1);
  const mx = ux * Math.cos(angle) - uy * Math.sin(angle);
  const my = ux * Math.sin(angle) + uy * Math.cos(angle);
  const middle: Pt = [root[0] + mx * first, root[1] + my * first];
  const toEnd = Math.hypot(target[0] - middle[0], target[1] - middle[1]) || 1;
  const end = add(middle, [(target[0] - middle[0]) / toEnd, (target[1] - middle[1]) / toEnd], second);
  return [middle, end];
}

function limb(root: Pt, value: Limb, first: number, second: number, defaultBend: 1 | -1): [Pt, Pt] {
  if (Array.isArray(value)) {
    const middle = add(root, dir(value[0]), first);
    return [middle, add(middle, dir(value[1]), second)];
  }
  const target = "to" in value ? value.to : add(root, value.rel);
  return reach(root, target, first, second, value.bend ?? defaultBend);
}

const HANGING: Limb = [4, 4];
const STRAIGHT: Limb = [0, 0];

export function solve(pose: Pose, view: FigureSpec["view"] = "side"): Joints {
  const spread = view === "front" ? 1 : 0;
  const hip = pose.hip;
  const shoulder = add(hip, dir(pose.torso), LENGTH.torso);
  const shoulderNear = add(shoulder, [4 * spread, 0]);
  const shoulderFar = add(shoulder, [-4 * spread, 0]);
  const hipNear = add(hip, [3 * spread, 0]);
  const hipFar = add(hip, [-3 * spread, 0]);
  const head = add(shoulder, dir(pose.head ?? pose.torso), LENGTH.neck);
  const [elbow, hand] = limb(shoulderNear, pose.arm ?? HANGING, LENGTH.upper, LENGTH.fore, -1);
  const [elbow2, hand2] = limb(shoulderFar, pose.arm2 ?? pose.arm ?? HANGING, LENGTH.upper, LENGTH.fore, -1);
  const [knee, ankle] = limb(hipNear, pose.leg ?? STRAIGHT, LENGTH.thigh, LENGTH.shin, 1);
  const [knee2, ankle2] = limb(hipFar, pose.leg2 ?? pose.leg ?? STRAIGHT, LENGTH.thigh, LENGTH.shin, 1);
  const toe = add(ankle, dir(pose.toe ?? 90), LENGTH.foot);
  const toe2 = add(ankle2, dir(pose.toe2 ?? (spread ? -90 : pose.toe ?? 90)), LENGTH.foot);
  return {
    hip: hipNear,
    hip2: hipFar,
    shoulder: shoulderNear,
    shoulder2: shoulderFar,
    head,
    elbow,
    hand,
    elbow2,
    hand2,
    knee,
    ankle,
    toe,
    knee2,
    ankle2,
    toe2,
  };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixPt = (a: Pt, b: Pt, t: number): Pt => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

/** Joints between the two poses: each joint moves in a straight line, so hands and feet that stay put do stay put. */
export function jointsAt(spec: FigureSpec, t: number): Joints {
  const a = solve(spec.poses[0], spec.view);
  if (t <= 0) return a;
  const b = solve(spec.poses[1], spec.view);
  if (t >= 1) return b;
  const out = {} as Joints;
  for (const key of Object.keys(a) as (keyof Joints)[]) out[key] = mixPt(a[key], b[key], t);
  return keepLengths(out);
}

function fix(from: Pt, to: Pt, length: number): Pt {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const distance = Math.hypot(dx, dy) || 1;
  return [from[0] + (dx / distance) * length, from[1] + (dy / distance) * length];
}

/**
 * The mixed limb with its true lengths: the hand or foot stays where the mix
 * put it (so planted feet stay planted) and the elbow or knee bends to the
 * same side it was on.
 */
function settle(root: Pt, middle: Pt, end: Pt, first: number, second: number): [Pt, Pt] {
  const options = ([1, -1] as const).map((bend) => reach(root, end, first, second, bend));
  const gap = ([candidate]: [Pt, Pt]) => Math.hypot(candidate[0] - middle[0], candidate[1] - middle[1]);
  return gap(options[0]!) <= gap(options[1]!) ? options[0]! : options[1]!;
}

/** Straight-line mixing changes bone lengths mid-way; give each bone its length back. */
function keepLengths(j: Joints): Joints {
  // Side view only: in the front view the shoulders sit apart from the spine.
  const side = j.hip[0] === j.hip2[0] && j.hip[1] === j.hip2[1];
  const shoulder = side ? fix(j.hip, j.shoulder, LENGTH.torso) : j.shoulder;
  const shoulder2 = side ? shoulder : j.shoulder2;
  const head = side ? fix(shoulder, j.head, LENGTH.neck) : j.head;
  const [elbow, hand] = settle(shoulder, j.elbow, j.hand, LENGTH.upper, LENGTH.fore);
  const [elbow2, hand2] = settle(shoulder2, j.elbow2, j.hand2, LENGTH.upper, LENGTH.fore);
  const [knee, ankle] = settle(j.hip, j.knee, j.ankle, LENGTH.thigh, LENGTH.shin);
  const [knee2, ankle2] = settle(j.hip2, j.knee2, j.ankle2, LENGTH.thigh, LENGTH.shin);
  const foot = (toe: Pt, oldAnkle: Pt, newAnkle: Pt) =>
    fix(newAnkle, add(toe, [newAnkle[0] - oldAnkle[0], newAnkle[1] - oldAnkle[1]]), LENGTH.foot);
  return {
    ...j,
    shoulder,
    shoulder2,
    head,
    elbow,
    hand,
    elbow2,
    hand2,
    knee,
    ankle,
    toe: foot(j.toe, j.ankle, ankle),
    knee2,
    ankle2,
    toe2: foot(j.toe2, j.ankle2, ankle2),
  };
}
