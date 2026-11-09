import { FLOOR as F, GROUND as G, type FigureSpec, type Joints, type Limb, type Pt, type PropShape } from "./model";

/** Each exercise as two poses (start and end of the move) plus its equipment. */

const to = (x: number, y: number, bend?: 1 | -1): Limb => (bend ? { to: [x, y], bend } : { to: [x, y] });
const rel = (x: number, y: number, bend?: 1 | -1): Limb => (bend ? { rel: [x, y], bend } : { rel: [x, y] });
const line = (points: Pt[], width = 2.5, front = false): PropShape => ({ kind: "line", points, width, front });
const disc = (at: Pt, r: number, front = true): PropShape => ({ kind: "circle", at, r, front, filled: true });
const ring = (at: Pt, r: number, front = false): PropShape => ({ kind: "circle", at, r, front });
const dumbbells = (now: Joints): PropShape[] => [disc(now.hand2, 3, false), disc(now.hand, 3)];
const plate = (at: Pt): PropShape[] => [ring(at, 6.5, true), disc(at, 1.6)];

const mat: PropShape = line([[12, G - 0.5], [108, G - 0.5]], 2);
const bench = (x1: number, x2: number, top: number): PropShape[] => [
  line([[x1, top], [x2, top]], 3.5),
  line([[x1 + 4, top], [x1 + 4, G]], 2.5),
  line([[x2 - 4, top], [x2 - 4, G]], 2.5),
];
const chair = (x: number, seat: number): PropShape[] => [
  line([[x, seat], [x + 18, seat]], 3.5),
  line([[x + 1, seat], [x - 1, seat - 22]], 3),
  line([[x + 1, seat], [x + 1, G]], 2.5),
  line([[x + 17, seat], [x + 17, G]], 2.5),
];
const wall = (x: number): PropShape => line([[x, -6], [x, G]], 3);

const STAND = { hip: [60, 47.5] as Pt, torso: 180, arm: [4, 4] as Limb, arm2: [-4, -4] as Limb };
const standFeet = { leg: to(62, F), leg2: to(58, F) };

export const FIGURES: Record<string, FigureSpec> = {
  "sit-to-stand": {
    poses: [
      { hip: [45, 63], torso: 162, arm: [75, 88], arm2: [70, 85], leg: to(62, F), leg2: to(60, F) },
      { hip: [58, 47.6], torso: 178, arm: [85, 90], arm2: [80, 86], leg: to(62, F), leg2: to(60, F) },
    ],
    props: () => chair(29, 66),
  },
  "bodyweight-squat": {
    poses: [
      { ...STAND, ...standFeet },
      { hip: [47, 63], torso: 142, arm: [92, 92], arm2: [88, 90], ...standFeet },
    ],
  },
  "goblet-squat": {
    poses: [
      { ...STAND, arm: [20, 165], arm2: [18, 160], ...standFeet },
      { hip: [47, 63], torso: 145, arm: [40, 172], arm2: [36, 168], ...standFeet },
    ],
    props: (now) => [disc(now.hand, 3.8)],
  },
  "barbell-squat": {
    poses: [
      { ...STAND, arm: rel(-2, -3), arm2: rel(-3, -3), ...standFeet },
      { hip: [47, 63], torso: 142, head: 155, arm: rel(-2, -3), arm2: rel(-3, -3), ...standFeet },
    ],
    props: (now) => plate([now.shoulder[0] - 2, now.shoulder[1] - 1]),
  },
  "leg-press": {
    poses: [
      { hip: [40, 58], torso: 232, head: 222, arm: to(45, 64), leg: to(58.8, 51.2), leg2: to(57.8, 52), toe: 200, toe2: 200 },
      { hip: [40, 58], torso: 232, head: 222, arm: to(45, 64), leg: to(70, 47), leg2: to(69, 47.8), toe: 200, toe2: 200 },
    ],
    props: (now) => {
      const c: Pt = [now.ankle[0] + 2.8, now.ankle[1] - 1];
      return [
        line([[37, 63], [19, 49]], 3.5),
        line([[37, 63], [49, 63]], 3.5),
        line([[43, 63], [43, G]], 2.5),
        line([[25, 54], [25, G]], 2.5),
        line([[54, 66], [92, 52]], 2),
        line([[c[0] - 3.4, c[1] - 9.4], [c[0] + 1.4, c[1] + 3.8]], 4, true),
      ];
    },
  },
  "step-up": {
    poses: [
      { hip: [50, 47.5], torso: 172, arm: [22, 10], arm2: [-20, -10], leg: to(64, 67), leg2: to(48, F) },
      { hip: [63, 33.5], torso: 178, arm: [-18, -5], arm2: [25, 12], leg: to(64, 67), leg2: [70, 0], toe2: 100 },
    ],
    props: () => [line([[56, 70], [86, 70], [86, G], [56, G], [56, 70]], 2.5)],
  },
  "reverse-lunge": {
    poses: [
      { ...STAND, hip: [62, 47.6], leg: to(64, F), leg2: to(60, F) },
      { hip: [55, 62], torso: 178, leg: to(66, F), leg2: to(33, 78), toe2: 60 },
    ],
  },
  "bulgarian-split-squat": {
    poses: [
      { hip: [55, 48], torso: 176, leg: to(62, F), leg2: to(32, 62), toe2: 290 },
      { hip: [50, 62], torso: 172, leg: to(62, F), leg2: to(32, 62), toe2: 290 },
    ],
    props: () => bench(14, 38, 66),
  },
  "glute-bridge": {
    poses: [
      { hip: [52, 80], torso: 270, head: 262, arm: [92, 90], leg: to(73, F), leg2: to(71, F) },
      { hip: [53, 67], torso: 302, head: 272, arm: [100, 92], leg: to(73, F), leg2: to(71, F) },
    ],
    props: () => [mat],
  },
  "single-leg-bridge": {
    poses: [
      { hip: [52, 80], torso: 270, head: 262, arm: [92, 90], leg: to(72, F), leg2: [125, 125] },
      { hip: [53, 67], torso: 302, head: 272, arm: [100, 92], leg: to(72, F), leg2: [112, 112] },
    ],
    props: () => [mat],
  },
  "dumbbell-rdl": {
    poses: [
      { ...STAND, hip: [58, 47.6], arm: [2, 2], arm2: [0, 0], leg: to(60, F), leg2: to(58, F) },
      { hip: [49, 49.5], torso: 100, head: 100, arm: [3, 3], arm2: [0, 0], leg: to(60, F), leg2: to(58, F) },
    ],
    props: dumbbells,
  },
  "leg-curl": {
    poses: [
      { hip: [48, 60], torso: 270, head: 262, arm: to(22, 68), leg: [90, 90], leg2: [91, 91], toe: 0, toe2: 0 },
      { hip: [48, 60], torso: 270, head: 262, arm: to(22, 68), leg: [90, 205], leg2: [91, 206], toe: 300, toe2: 300 },
    ],
    props: (now) => [...bench(14, 66, 64), disc([now.ankle[0] + 1, now.ankle[1] - 3], 3)],
  },
  "wall-push-up": {
    poses: [
      { hip: [60.1, 52.6], torso: 160, arm: to(89, 38), leg: to(50, F), leg2: to(48, F), toe: 88, toe2: 88 },
      { hip: [67, 51.6], torso: 150, arm: to(89, 38), leg: to(50, F), leg2: to(48, F), toe: 84, toe2: 84 },
    ],
    props: () => [wall(93)],
  },
  "incline-push-up": {
    poses: [
      { hip: [51.9, 54.1], torso: 130, head: 125, arm: to(82, 59), leg: to(30, 76), toe: 20 },
      { hip: [60.3, 60.6], torso: 117, head: 112, arm: to(82, 59), leg: to(30, 76), toe: 20 },
    ],
    props: () => bench(72, 98, 62),
  },
  "push-up": {
    poses: [
      { hip: [58.5, 66.1], torso: 107, head: 102, arm: to(84, F), leg: to(26, 76), toe: 20 },
      { hip: [59.8, 71.9], torso: 97, head: 94, arm: to(84, F), leg: to(26, 76), toe: 20 },
    ],
    props: () => [mat],
  },
  "dumbbell-bench-press": {
    poses: [
      { hip: [56, 61], torso: 270, head: 264, arm: to(35, 38), leg: to(76, F), leg2: to(74, F) },
      { hip: [56, 61], torso: 270, head: 264, arm: to(35, 51), leg: to(76, F), leg2: to(74, F) },
    ],
    props: (now) => [...bench(12, 62, 64.5), ...dumbbells(now)],
  },
  "barbell-bench-press": {
    poses: [
      { hip: [56, 61], torso: 270, head: 264, arm: to(35, 38), leg: to(76, F), leg2: to(74, F) },
      { hip: [56, 61], torso: 270, head: 264, arm: to(35, 51), leg: to(76, F), leg2: to(74, F) },
    ],
    props: (now) => [...bench(12, 62, 64.5), ...plate(now.hand)],
  },
  "dumbbell-shoulder-press": {
    poses: [
      { ...STAND, hip: [58, 47.6], arm: to(63, 20), arm2: to(61, 20), leg: to(60, F), leg2: to(56, F) },
      { ...STAND, hip: [58, 47.6], arm: to(59, 2), arm2: to(58, 2), leg: to(60, F), leg2: to(56, F) },
    ],
    props: dumbbells,
  },
  "lateral-raise": {
    view: "front",
    poses: [
      { hip: [60, 47.6], torso: 180, arm: [10, 6], arm2: [-10, -6], leg: [2, 2], leg2: [-2, -2] },
      { hip: [60, 47.6], torso: 180, arm: [82, 88], arm2: [-82, -88], leg: [2, 2], leg2: [-2, -2] },
    ],
    props: dumbbells,
  },
  "backpack-row": {
    poses: [
      { hip: [52, 50], torso: 120, head: 112, arm: [2, 2], arm2: [0, 0], leg: to(60, F), leg2: to(58, F) },
      { hip: [52, 50], torso: 120, head: 112, arm: to(62, 50), arm2: to(61, 51), leg: to(60, F), leg2: to(58, F) },
    ],
    props: (now) => [line([[now.hand[0] - 4, now.hand[1] + 1], [now.hand[0] + 4, now.hand[1] + 1], [now.hand[0] + 4, now.hand[1] + 10], [now.hand[0] - 4, now.hand[1] + 10], [now.hand[0] - 4, now.hand[1] + 1]], 3, true)],
  },
  "towel-row": {
    poses: [
      { hip: [66, 52], torso: 200, head: 192, arm: to(80, 40), leg: to(80, F), leg2: to(78, F) },
      { hip: [72, 49], torso: 190, head: 184, arm: to(80, 40), leg: to(80, F), leg2: to(78, F) },
    ],
    props: (now) => [wall(97), ring([95, 42], 1.5), line([now.hand, [95, 42]], 2.5, true)],
  },
  "lat-pulldown": {
    poses: [
      { hip: [52, 58], torso: 186, head: 182, arm: to(56, 6), arm2: to(55, 6), leg: to(68, F), leg2: to(66, F) },
      { hip: [52, 58], torso: 192, head: 186, arm: to(58, 30), arm2: to(57, 30), leg: to(68, F), leg2: to(66, F) },
    ],
    props: (now) => [
      line([[42, 62], [62, 62]], 3.5),
      line([[52, 62], [52, G]], 2.5),
      ring([60, 50], 2.6),
      line([[56, -5], now.hand], 1.5),
      ring([56, -5], 2.4),
      line([[56, -5], [92, -5], [92, G]], 3),
      disc(now.hand, 2.2),
    ],
  },
  "seated-row": {
    poses: [
      { hip: [42, 62], torso: 160, head: 155, arm: to(71, 47), arm2: to(70, 48), leg: to(74, 60), leg2: to(73, 61), toe: 170, toe2: 170 },
      { hip: [42, 62], torso: 186, head: 182, arm: to(53, 50), arm2: to(52, 51), leg: to(74, 60), leg2: to(73, 61), toe: 170, toe2: 170 },
    ],
    props: (now) => [
      line([[28, 65.5], [56, 65.5]], 3.5),
      line([[34, 65.5], [34, G]], 2.5),
      line([[80, 47], [80, 68]], 3.5),
      line([now.hand, [92, 52]], 1.5),
      ring([92, 52], 2.4),
      line([[92, 52], [92, G]], 3),
      disc(now.hand, 2.2),
    ],
  },
  "dumbbell-row": {
    poses: [
      { hip: [54, 47], torso: 100, head: 98, arm: [0, 0], arm2: to(84, 64), leg: to(50, F), leg2: [5, -88], toe2: 270 },
      { hip: [54, 47], torso: 100, head: 98, arm: to(64, 50), arm2: to(84, 64), leg: to(50, F), leg2: [5, -88], toe2: 270 },
    ],
    props: (now) => [...bench(40, 92, 67), disc(now.hand, 3.2)],
  },
  "dead-bug": {
    poses: [
      { hip: [55, 80], torso: 270, head: 262, arm: [180, 180], arm2: [180, 180], leg: [180, 90], leg2: [180, 90] },
      { hip: [55, 80], torso: 270, head: 262, arm: [240, 248], arm2: [180, 180], leg: [180, 90], leg2: [100, 98] },
    ],
    props: () => [mat],
  },
  "bird-dog": {
    poses: [
      { hip: [48, 64], torso: 106, head: 100, arm: to(69.5, F), arm2: to(69, F), leg: [0, -90], leg2: [0, -90], toe: 270, toe2: 270 },
      { hip: [48, 64], torso: 106, head: 100, arm: [100, 100], arm2: to(69, F), leg: [0, -90], leg2: [-86, -88], toe: 270, toe2: 270 },
    ],
    props: () => [mat],
  },
  plank: {
    poses: [
      { hip: [57.7, 71.7], torso: 97.2, head: 95, arm: [0, 90], leg: to(24, 76), toe: 20 },
      { hip: [57.7, 71.2], torso: 97.6, head: 95, arm: [0, 90], leg: to(24, 76), toe: 20 },
    ],
    props: () => [mat],
  },
  "side-plank": {
    poses: [
      { hip: [57.7, 71.7], torso: 97.2, head: 92, arm: [180, 180], arm2: [0, 90], leg: to(24, 77), toe: 50 },
      { hip: [57.7, 70.6], torso: 98, head: 92, arm: [170, 172], arm2: [0, 90], leg: to(24, 77), toe: 50 },
    ],
    props: () => [mat],
  },
  "mountain-climber": {
    poses: [
      { hip: [58.5, 66.1], torso: 107, head: 102, arm: to(84, F), leg: to(60, 75), leg2: to(26, 76), toe: 40, toe2: 20 },
      { hip: [58.5, 66.1], torso: 107, head: 102, arm: to(84, F), leg: to(26, 76), leg2: to(60, 75), toe: 20, toe2: 40 },
    ],
    props: () => [mat],
  },
  "brisk-walk": {
    poses: [
      { hip: [60, 48.5], torso: 176, arm: [-25, -10], arm2: [25, 45], leg: to(70, F), leg2: to(49, 78), toe: 90, toe2: 60 },
      { hip: [60, 48.5], torso: 176, arm: [25, 45], arm2: [-25, -10], leg: to(49, 78), leg2: to(70, F), toe: 60, toe2: 90 },
    ],
  },
  "stationary-bike": {
    poses: [
      { hip: [48, 52], torso: 150, head: 140, arm: to(76, 36), leg: to(65, 72), leg2: to(51, 72) },
      { hip: [48, 52], torso: 150, head: 140, arm: to(76, 36), leg: to(58, 79), leg2: to(58, 65) },
    ],
    props: () => [
      ring([62, 72], 11),
      line([[42, 55], [54, 55]], 3.5),
      line([[48, 55], [58, 72]], 2.5),
      line([[62, 72], [74, 38], [80, 38]], 2.5),
      line([[48, 84], [80, 84]], 3),
      ring([58, 72], 2),
    ],
  },
  "jumping-jack": {
    view: "front",
    poses: [
      { hip: [60, 47.6], torso: 180, arm: [10, 6], arm2: [-10, -6], leg: to(63, F), leg2: to(57, F) },
      { hip: [60, 49], torso: 180, arm: [150, 165], arm2: [-150, -165], leg: to(72, F), leg2: to(48, F) },
    ],
  },
  "high-knees": {
    poses: [
      { hip: [60, 47], torso: 178, arm: [-35, 60], arm2: [40, 150], leg: [90, 0], leg2: to(58, 78), toe2: 60 },
      { hip: [60, 47], torso: 178, arm: [40, 150], arm2: [-35, 60], leg: to(60, 78), leg2: [90, 0], toe: 60 },
    ],
  },
  "easy-run": {
    poses: [
      { hip: [60, 50], torso: 172, arm: [-40, 50], arm2: [40, 140], leg: to(72, F), leg2: [-28, -105] },
      { hip: [60, 50], torso: 172, arm: [40, 140], arm2: [-40, 50], leg: [-28, -105], leg2: to(72, F) },
    ],
  },
  burpee: {
    poses: [
      { hip: [53, 64], torso: 122, head: 112, arm: to(74, F), arm2: to(72, F), leg: to(60, F), leg2: to(58, F) },
      { hip: [60, 44], torso: 180, arm: [172, 178], arm2: [168, 176], leg: to(62, 78), leg2: to(60, 78), toe: 60, toe2: 60 },
    ],
    props: () => [mat],
  },
  "leg-extension": {
    poses: [
      { hip: [46, 58], torso: 186, head: 182, arm: [12, 40], leg: [90, 0], leg2: [91, 1] },
      { hip: [46, 58], torso: 186, head: 182, arm: [12, 40], leg: [90, 84], leg2: [91, 85] },
    ],
    props: (now) => [
      line([[36, 61.5], [60, 61.5]], 3.5),
      line([[36, 61.5], [38, 36]], 3.5),
      line([[48, 61.5], [48, G]], 2.5),
      disc([now.ankle[0] + 2.5, now.ankle[1]], 3),
    ],
  },
  "hip-thrust": {
    poses: [
      { hip: [52, 76], torso: 230, head: 214, arm: rel(10, 4), leg: to(72, F), leg2: to(70, F) },
      { hip: [56, 62], torso: 270, head: 248, arm: rel(14, 1), leg: to(72, F), leg2: to(70, F) },
    ],
    props: (now) => [...bench(8, 36, 64.5), ...plate([now.hip[0] + 1, now.hip[1] - 9])],
  },
  deadlift: {
    poses: [
      { hip: [48, 64], torso: 120, head: 112, arm: to(62, 75), arm2: to(61, 75), leg: to(60, F), leg2: to(58, F) },
      { ...STAND, hip: [58, 47.6], arm: [3, 3], arm2: [2, 2], leg: to(60, F), leg2: to(58, F) },
    ],
    props: (now) => plate([now.hand[0], now.hand[1] + 1.5]),
  },
  "bent-over-row": {
    poses: [
      { hip: [52, 50], torso: 125, head: 115, arm: [2, 2], arm2: [0, 0], leg: to(60, F), leg2: to(58, F) },
      { hip: [52, 50], torso: 125, head: 115, arm: to(62, 52), arm2: to(61, 52), leg: to(60, F), leg2: to(58, F) },
    ],
    props: (now) => plate(now.hand),
  },
  "pull-up": {
    poses: [
      { hip: [62, 44], torso: 184, arm: to(64, -2), leg: [10, -25], leg2: [8, -28] },
      { hip: [55, 29], torso: 188, arm: to(64, -2), leg: [12, -25], leg2: [10, -28] },
    ],
    props: () => [line([[64, -2], [98, -2], [98, G]], 3), disc([64, -2], 2.4)],
  },
  "dumbbell-curl": {
    poses: [
      { ...STAND, hip: [58, 47.6], arm: [5, 4], arm2: [2, 1], leg: to(60, F), leg2: to(56, F) },
      { ...STAND, hip: [58, 47.6], arm: [6, 165], arm2: [3, 162], leg: to(60, F), leg2: to(56, F) },
    ],
    props: dumbbells,
  },
  "triceps-pushdown": {
    poses: [
      { hip: [58, 47.6], torso: 174, arm: [8, 140], arm2: [6, 138], leg: to(60, F), leg2: to(56, F) },
      { hip: [58, 47.6], torso: 174, arm: [8, 8], arm2: [6, 6], leg: to(60, F), leg2: to(56, F) },
    ],
    props: (now) => [line([[88, -6], [88, G]], 3), ring([84, -2], 2.4), line([[84, -2], now.hand], 1.5), disc(now.hand, 2)],
  },
  "bench-dip": {
    poses: [
      { hip: [48.8, 53], torso: 182, arm: to(44, 53), leg: to(64, F), leg2: to(62, F) },
      { hip: [48.8, 64], torso: 182, arm: to(44, 53), leg: to(64, F), leg2: to(62, F) },
    ],
    props: () => bench(18, 45, 56),
  },
  "calf-raise": {
    poses: [
      { hip: [58, 47.6], torso: 180, arm: to(80, 32), arm2: [-4, -4], leg: to(58, F), leg2: to(56, F) },
      { hip: [58, 43.6], torso: 180, arm: to(80, 32), arm2: [-4, -4], leg: to(58, 77), leg2: to(56, 77), toe: 40, toe2: 40 },
    ],
    props: () => [wall(84)],
  },
  crunch: {
    poses: [
      { hip: [55, 80], torso: 270, head: 262, arm: rel(-9, -4), leg: to(74, F), leg2: to(72, F) },
      { hip: [55, 80], torso: 245, head: 238, arm: rel(-9, -4), leg: to(74, F), leg2: to(72, F) },
    ],
    props: () => [mat],
  },
  "jump-rope": {
    poses: [
      { hip: [60, 46.5], torso: 180, arm: [12, 60], arm2: [-8, 50], leg: to(61, 79), leg2: to(59, 79), toe: 60, toe2: 60 },
      { hip: [60, 42], torso: 180, arm: [12, 75], arm2: [-8, 62], leg: to(61, 74.5), leg2: to(59, 74.5), toe: 60, toe2: 60 },
    ],
    props: (now, t) => [
      { kind: "curve", from: now.hand, via: [62, 96 - t * 112], to: now.hand2, width: 1.5, front: t < 0.5 },
    ],
  },
};
