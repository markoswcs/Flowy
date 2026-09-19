"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import {
  changePassword,
  getCurrentUser,
  getPreferences,
  getProfile,
  updatePreferences,
  updateProfile,
  uploadAvatar,
} from "@/services/profile";

export function useProfile() {
  const client = createClient();
  return useQuery({ queryKey: ["profile"], queryFn: () => getProfile(client) });
}

export function usePreferences() {
  const client = createClient();
  return useQuery({
    queryKey: ["preferences"],
    queryFn: () => getPreferences(client),
  });
}

export function useCurrentUser() {
  const client = createClient();
  return useQuery({
    queryKey: ["current-user"],
    queryFn: () => getCurrentUser(client),
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: Parameters<typeof updateProfile>[1]) =>
      updateProfile(client, changes),
    onSuccess: (profile) => queryClient.setQueryData(["profile"], profile),
  });
}

export function useUpdatePreferences() {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: Parameters<typeof updatePreferences>[1]) =>
      updatePreferences(client, changes),
    onSuccess: (preferences) =>
      queryClient.setQueryData(["preferences"], preferences),
  });
}

export function useUploadAvatar() {
  const client = createClient();
  const update = useUpdateProfile();
  return useMutation({
    mutationFn: async (file: File) => {
      const publicUrl = await uploadAvatar(client, file);
      return update.mutateAsync({ avatar_url: publicUrl });
    },
  });
}

export function useChangePassword() {
  const client = createClient();
  return useMutation({
    mutationFn: (password: string) => changePassword(client, password),
  });
}
