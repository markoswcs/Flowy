import { describe, expect, it } from "vitest";

import { EXERCISES } from "../exercises";
import { FIGURES } from "./figures";
import { GROUND, LENGTH, VIEW_BOX, jointsAt } from "./model";

const distance = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe("exercise drawings", () => {
  it("has a drawing for every exercise, and none left over", () => {
    expect(EXERCISES.filter((exercise) => !FIGURES[exercise.id]).map(({ id }) => id)).toEqual([]);
    const ids = new Set(EXERCISES.map(({ id }) => id));
    expect(Object.keys(FIGURES).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("keeps every pose inside the picture and above the ground, with bones of the same length", () => {
    for (const [id, spec] of Object.entries(FIGURES)) {
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const joints = jointsAt(spec, t);
        for (const [name, [x, y]] of Object.entries(joints)) {
          const where = `${id} ${name} at ${t}`;
          expect(Number.isFinite(x) && Number.isFinite(y), where).toBe(true);
          expect(x, where).toBeGreaterThanOrEqual(VIEW_BOX.x);
          expect(x, where).toBeLessThanOrEqual(VIEW_BOX.x + VIEW_BOX.width);
          expect(y, where).toBeGreaterThanOrEqual(VIEW_BOX.y);
          expect(y, where).toBeLessThanOrEqual(GROUND);
        }
        expect(distance(joints.shoulder, joints.elbow), id).toBeCloseTo(LENGTH.upper, 0);
        expect(distance(joints.knee, joints.ankle), id).toBeCloseTo(LENGTH.shin, 0);
      }
    }
  });
});
