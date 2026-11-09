import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { localDateKey } from "@/features/tasks/date-utils";

import { buildSession } from "../plan";
import type { WorkoutLog, WorkoutProfile } from "../types";

const mutate = vi.fn();
let enabled = true;
let logs: WorkoutLog[] = [];

const today = localDateKey();
const todayWeekday = new Date().getDay();

const profile: WorkoutProfile = {
  user_id: "u1",
  goal: "health",
  level: "beginner",
  days: [todayWeekday],
  minutes: 30,
  place: "home",
  limitations: [],
  intensity: 0,
  swaps: {},
  created_at: "2026-01-01T12:00:00Z",
  updated_at: "2026-01-01T12:00:00Z",
};
let currentProfile: WorkoutProfile = profile;

vi.mock("../use-workouts", () => ({
  useWorkoutsEnabled: () => ({ enabled, loading: false }),
  useWorkoutProfile: () => ({ data: currentProfile, isLoading: false }),
  useWorkoutLogs: () => ({ data: logs, isLoading: false }),
  useLogWorkout: () => ({ mutate, isPending: false }),
  useSwapExercise: () => ({ mutate: vi.fn(), isPending: false }),
  useUndoWorkoutLog: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { TodayWorkoutCard } from "./today-workout-card";
import { WorkoutSession } from "./workout-session";

beforeEach(() => {
  mutate.mockReset();
  enabled = true;
  logs = [];
  currentProfile = profile;
});

afterEach(() => {
  cleanup();
});

describe("TodayWorkoutCard", () => {
  it("shows today's workout and logs it with how it felt", () => {
    render(<TodayWorkoutCard />);
    expect(screen.getByText("Corpo todo A")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Concluí/ }));
    fireEvent.click(screen.getByRole("button", { name: "Difícil" }));

    expect(mutate.mock.calls[0]![0]).toMatchObject({ day: today, session: "full_a", status: "done", feeling: "hard" });
  });

  it("stays hidden for people who did not turn Treinos on", () => {
    enabled = false;
    const { container } = render(<TodayWorkoutCard />);
    expect(container.innerHTML).toBe("");
  });

  it("stays hidden on rest days", () => {
    currentProfile = { ...profile, days: [(todayWeekday + 1) % 7] };
    const { container } = render(<TodayWorkoutCard />);
    expect(container.innerHTML).toBe("");
  });

  it("shrinks to a line once done", () => {
    logs = [{ id: "l1", user_id: "u1", day: today, session: "full_a", status: "done", feeling: "ok", created_at: "" }];
    render(<TodayWorkoutCard />);
    expect(screen.getByText("Treino de hoje concluído")).toBeTruthy();
  });
});

describe("WorkoutSession", () => {
  it("explains how to do an exercise and can skip the day", () => {
    const session = buildSession(profile, "full_a");
    render(<WorkoutSession session={session} profile={profile} day={today} />);

    fireEvent.click(screen.getAllByRole("button", { name: /Como fazer/ })[0]!);
    expect(screen.getByText(session.exercises[0]!.exercise.steps[0]!)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Pular hoje/ }));
    expect(mutate.mock.calls[0]![0]).toMatchObject({ day: today, status: "skipped" });
  });
});
