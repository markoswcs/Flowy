"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { localDateKey } from "@/features/tasks/date-utils";
import { toast } from "@/lib/toast";
import { messageFromUnknownError } from "@/services/authenticated-client";
import {
  deleteBodyWeight,
  deleteSet,
  listBodyWeights,
  listSets,
  saveBodyWeight,
  saveSet,
  saveWeightGoal,
} from "@/services/strength";

import type { BodyWeight, LoggedSet } from "./strength";
import { workoutKeys } from "./use-workouts";

const strengthKeys = {
  sets: () => [...workoutKeys.all, "sets"] as const,
  weights: () => [...workoutKeys.all, "body-weights"] as const,
};

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateKey(date);
}

/** A year of sets: last time, records and the history charts. */
export function useLoggedSets(enabled = true) {
  return useQuery({ queryKey: strengthKeys.sets(), queryFn: () => listSets(daysAgo(366)), enabled, staleTime: 60_000 });
}

export function useBodyWeights(enabled = true) {
  return useQuery({ queryKey: strengthKeys.weights(), queryFn: () => listBodyWeights(daysAgo(366)), enabled, staleTime: 60_000 });
}

const replace = (sets: LoggedSet[] | undefined, set: LoggedSet) => [
  set,
  ...(sets ?? []).filter(
    (item) => !(item.day === set.day && item.exercise_id === set.exercise_id && item.set_number === set.set_number),
  ),
];

export function useSaveSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveSet,
    onMutate: (set) => {
      const previous = queryClient.getQueryData<LoggedSet[]>(strengthKeys.sets());
      queryClient.setQueryData(strengthKeys.sets(), replace(previous, set));
      return { previous };
    },
    onError: (error, _set, context) => {
      queryClient.setQueryData(strengthKeys.sets(), context?.previous);
      toast.error("Não foi possível salvar a série.", { description: messageFromUnknownError(error) });
    },
  });
}

export function useDeleteSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSet,
    onMutate: (set) => {
      const previous = queryClient.getQueryData<LoggedSet[]>(strengthKeys.sets());
      queryClient.setQueryData(
        strengthKeys.sets(),
        (previous ?? []).filter(
          (item) => !(item.day === set.day && item.exercise_id === set.exercise_id && item.set_number === set.set_number),
        ),
      );
      return { previous };
    },
    onError: (_error, _set, context) => queryClient.setQueryData(strengthKeys.sets(), context?.previous),
  });
}

export function useSaveBodyWeight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveBodyWeight,
    onMutate: (entry: BodyWeight) => {
      const previous = queryClient.getQueryData<BodyWeight[]>(strengthKeys.weights());
      queryClient.setQueryData(
        strengthKeys.weights(),
        [...(previous ?? []).filter((item) => item.day !== entry.day), entry].sort((a, b) => a.day.localeCompare(b.day)),
      );
      return { previous };
    },
    onError: (error, _entry, context) => {
      queryClient.setQueryData(strengthKeys.weights(), context?.previous);
      toast.error("Não foi possível salvar o peso.", { description: messageFromUnknownError(error) });
    },
  });
}

export function useDeleteBodyWeight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBodyWeight,
    onSettled: () => queryClient.invalidateQueries({ queryKey: strengthKeys.weights() }),
  });
}

export function useSaveWeightGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveWeightGoal,
    onSettled: () => queryClient.invalidateQueries({ queryKey: workoutKeys.profile() }),
    onError: () => toast.error("Não foi possível salvar a meta."),
  });
}
