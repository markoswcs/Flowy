import { describe, expect, it } from "vitest";

import { EXERCISE_BY_ID, EXERCISES } from "./exercises";
import {
  alternativesFor,
  buildSession,
  currentStreak,
  dayStatus,
  exerciseCount,
  formatDose,
  monthDays,
  nextIntensity,
  sessionKeyFor,
  sessionKeys,
  weekDays,
} from "./plan";
import type { WorkoutLog, WorkoutProfile } from "./types";

const profile: WorkoutProfile = {
  user_id: "u1",
  goal: "health",
  level: "beginner",
  days: [1, 3, 5],
  minutes: 30,
  place: "home",
  limitations: [],
  intensity: 0,
  swaps: {},
  custom_sessions: {},
  created_at: "2026-11-01T12:00:00Z",
  updated_at: "2026-11-01T12:00:00Z",
};

const log = (day: string, status: WorkoutLog["status"] = "done"): WorkoutLog => ({
  id: day,
  user_id: "u1",
  day,
  session: "full_a",
  status,
  feeling: "ok",
  created_at: `${day}T10:00:00Z`,
});

describe("sessionKeys", () => {
  it("splits the week by days and goal", () => {
    expect(sessionKeys({ goal: "health", days: [1, 3, 5] })).toEqual(["full_a", "full_b", "full_c"]);
    expect(sessionKeys({ goal: "gain_muscle", days: [1, 2, 4, 5] })).toEqual(["upper", "lower", "upper-2", "lower-2"]);
    expect(sessionKeys({ goal: "lose_weight", days: [2] })).toEqual(["full_a"]);
    expect(sessionKeys({ goal: "gain_muscle", days: [0, 1, 2, 3, 4, 5, 6] })).toHaveLength(7);
  });
});

describe("buildSession", () => {
  it("fits the time and the place", () => {
    const session = buildSession(profile, "full_a");
    expect(session.exercises).toHaveLength(exerciseCount(30, 8));
    expect(session.exercises.every(({ exercise }) => exercise.places.includes("home"))).toBe(true);
    expect(session.exercises.every(({ exercise }) => exercise.level === 1)).toBe(true);
  });

  it("never repeats an exercise inside a session", () => {
    const session = buildSession({ ...profile, minutes: 90, level: "advanced" }, "full_b");
    const ids = session.exercises.map(({ exercise }) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leaves out exercises that hurt where the person reported pain", () => {
    const session = buildSession({ ...profile, level: "advanced", minutes: 90, limitations: ["knee", "wrist"] }, "full_a");
    for (const { exercise } of session.exercises) {
      expect(exercise.avoid).not.toContain("knee");
      expect(exercise.avoid).not.toContain("wrist");
    }
  });

  it("gives a second use of a template other exercises", () => {
    const gym = { ...profile, goal: "gain_muscle" as const, place: "gym" as const, level: "advanced" as const, minutes: 60 };
    const first = buildSession(gym, "upper").exercises.map(({ exercise }) => exercise.id);
    const second = buildSession(gym, "upper-2").exercises.map(({ exercise }) => exercise.id);
    expect(second).not.toEqual(first);
    expect(buildSession(gym, "upper-2").name).toContain("variação 2");
  });

  it("raises the dose with intensity and lowers it after hard days", () => {
    const squat = (intensity: number) =>
      buildSession({ ...profile, intensity }, "full_a").exercises.find(({ exercise }) => exercise.slot === "squat")!;
    expect(squat(2).amount).toBeGreaterThan(squat(0).amount);
    expect(squat(2).sets).toBeGreaterThan(squat(0).sets);
    expect(squat(-2).amount).toBeLessThan(squat(0).amount);
  });

  it("uses the exercise the person swapped in", () => {
    const original = buildSession(profile, "full_a").exercises[0]!.exercise;
    const replacement = alternativesFor(original, profile)[0]!;
    const swapped = buildSession({ ...profile, swaps: { [original.id]: replacement.id } }, "full_a");
    expect(swapped.exercises[0]!.exercise.id).toBe(replacement.id);
  });

  it("uses a workout edited by hand exactly, in its order", () => {
    const edited = buildSession(
      {
        ...profile,
        custom_sessions: {
          full_a: [
            { id: "dumbbell-curl", sets: 4, amount: 12, rest: 60 },
            { id: "removed-from-the-app", sets: 1, amount: 1, rest: 0 },
            { id: "plank", sets: 2, amount: 45, rest: 30 },
          ],
        },
      },
      "full_a",
    );
    expect(edited.custom).toBe(true);
    expect(edited.exercises.map(({ exercise }) => exercise.id)).toEqual(["dumbbell-curl", "plank"]);
    expect(edited.exercises[0]).toMatchObject({ sets: 4, amount: 12, rest: 60 });
    expect(buildSession(profile, "full_b").custom).toBe(false);
  });

  it("never puts catalog-only exercises in the automatic plan", () => {
    const catalogOnly = new Set(EXERCISES.filter((exercise) => exercise.catalogOnly).map(({ id }) => id));
    expect(catalogOnly.size).toBeGreaterThan(0);
    for (const goal of ["gain_muscle", "lose_weight"] as const) {
      for (const place of ["home", "gym", "outdoor"] as const) {
        const someone = { ...profile, goal, place, level: "advanced" as const, minutes: 90, days: [0, 1, 2, 3, 4, 5, 6] };
        for (const key of sessionKeys(someone)) {
          for (const { exercise } of buildSession(someone, key).exercises) expect(catalogOnly.has(exercise.id)).toBe(false);
        }
      }
    }
  });
});

describe("calendar", () => {
  // 2026-11-02 is a Monday.
  it("maps weekdays to sessions and the rest to rest days", () => {
    expect(sessionKeyFor(profile, "2026-11-02")).toBe("full_a");
    expect(sessionKeyFor(profile, "2026-11-04")).toBe("full_b");
    expect(sessionKeyFor(profile, "2026-11-06")).toBe("full_c");
    expect(sessionKeyFor(profile, "2026-11-03")).toBeNull();
  });

  it("marks done, skipped, missed, rest, today and days before the plan", () => {
    const logs = new Map([["2026-11-02", log("2026-11-02")], ["2026-11-04", log("2026-11-04", "skipped")]]);
    const today = "2026-11-09";
    expect(dayStatus(profile, logs, "2026-11-02", today)).toBe("done");
    expect(dayStatus(profile, logs, "2026-11-04", today)).toBe("skipped");
    expect(dayStatus(profile, logs, "2026-11-06", today)).toBe("missed");
    expect(dayStatus(profile, logs, "2026-11-07", today)).toBe("rest");
    expect(dayStatus(profile, logs, "2026-11-09", today)).toBe("today");
    expect(dayStatus(profile, logs, "2026-11-11", today)).toBe("planned");
    expect(dayStatus(profile, logs, "2026-10-30", today)).toBe("before");
  });

  it("counts the streak across rest days and stops at a miss", () => {
    const logs = new Map(["2026-11-02", "2026-11-04", "2026-11-06"].map((day) => [day, log(day)]));
    expect(currentStreak(profile, logs, "2026-11-08")).toBe(3);
    // Monday the 9th not done yet: the streak still stands.
    expect(currentStreak(profile, logs, "2026-11-09")).toBe(3);
    // Wednesday the 11th: Monday was missed.
    expect(currentStreak(profile, logs, "2026-11-11")).toBe(0);
  });

  it("lists the week Monday first and the whole month", () => {
    expect(weekDays("2026-11-08")).toEqual([
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08",
    ]);
    expect(monthDays("2026-11-08")).toHaveLength(30);
    expect(monthDays("2026-02-10")).toHaveLength(28);
  });
});

describe("feedback and labels", () => {
  it("moves intensity within its limits", () => {
    expect(nextIntensity(0, "easy")).toBe(1);
    expect(nextIntensity(0, "hard")).toBe(-1);
    expect(nextIntensity(4, "easy")).toBe(4);
    expect(nextIntensity(-2, "hard")).toBe(-2);
    expect(nextIntensity(1, "ok")).toBe(1);
  });

  it("formats each kind of dose", () => {
    const byId = (id: string) => EXERCISE_BY_ID.get(id)!;
    expect(formatDose({ exercise: byId("glute-bridge"), sets: 3, amount: 12, rest: 60 })).toBe("3 × 12");
    expect(formatDose({ exercise: byId("plank"), sets: 3, amount: 40, rest: 60 })).toBe("3 × 40 s");
    expect(formatDose({ exercise: byId("brisk-walk"), sets: 1, amount: 15, rest: 0 })).toBe("15 min");
  });
});
