"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { localDateKey } from "@/features/tasks/date-utils";
import { usePreferences } from "@/features/settings/use-settings";
import { messageFromUnknownError } from "@/services/authenticated-client";
import {
  deleteWorkoutLog,
  getWorkoutProfile,
  listWorkoutLogs,
  logWorkout,
  saveWorkoutProfile,
  updateWorkoutProfile,
} from "@/services/workouts";
import { toast } from "@/lib/toast";

import { nextIntensity } from "./plan";
import type { Feeling, WorkoutProfile, WorkoutProfileInput } from "./types";

export const workoutKeys = {
  all: ["workouts"] as const,
  profile: () => [...workoutKeys.all, "profile"] as const,
  logs: () => [...workoutKeys.all, "logs"] as const,
};

/** Logs of the last ~3 months: enough for the month view and the streak. */
function logsSince() {
  const date = new Date();
  date.setDate(date.getDate() - 95);
  return localDateKey(date);
}

/** Whether the person turned Treinos on (off by default). */
export function useWorkoutsEnabled() {
  const preferences = usePreferences();
  return { enabled: preferences.data?.workouts_enabled === true, loading: preferences.isLoading };
}

export function useWorkoutProfile(enabled = true) {
  return useQuery({ queryKey: workoutKeys.profile(), queryFn: getWorkoutProfile, enabled });
}

export function useWorkoutLogs(enabled = true) {
  return useQuery({ queryKey: workoutKeys.logs(), queryFn: () => listWorkoutLogs(logsSince()), enabled });
}

function onError(message: string) {
  return (error: unknown) => toast.error(message, { description: messageFromUnknownError(error) });
}

export function useSaveWorkoutProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkoutProfileInput) => saveWorkoutProfile(input),
    onSuccess: (profile) => queryClient.setQueryData(workoutKeys.profile(), profile),
    onError: onError("Não foi possível salvar seu perfil de treino."),
  });
}

export function useSwapExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profile, from, to }: { profile: WorkoutProfile; from: string; to: string }) =>
      updateWorkoutProfile({ swaps: { ...profile.swaps, [from]: to } }),
    onSuccess: (profile) => queryClient.setQueryData(workoutKeys.profile(), profile),
    onError: onError("Não foi possível trocar o exercício."),
  });
}

/** Marks a day as trained (with how it felt, which adjusts the next workouts) or skipped. */
export function useLogWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      profile,
      day,
      session,
      status,
      feeling,
    }: {
      profile: WorkoutProfile;
      day: string;
      session: string;
      status: "done" | "skipped";
      feeling?: Feeling;
    }) => {
      const log = await logWorkout({ day, session, status, feeling });
      const intensity = feeling ? nextIntensity(profile.intensity, feeling) : profile.intensity;
      const updated =
        intensity !== profile.intensity ? await updateWorkoutProfile({ intensity }) : profile;
      return { log, profile: updated };
    },
    onSuccess: ({ profile }) => {
      queryClient.setQueryData(workoutKeys.profile(), profile);
      void queryClient.invalidateQueries({ queryKey: workoutKeys.logs() });
    },
    onError: onError("Não foi possível registrar o treino."),
  });
}

export function useUndoWorkoutLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (day: string) => deleteWorkoutLog(day),
    onSettled: () => queryClient.invalidateQueries({ queryKey: workoutKeys.logs() }),
    onError: onError("Não foi possível desfazer."),
  });
}
