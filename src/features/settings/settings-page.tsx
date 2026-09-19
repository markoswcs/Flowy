"use client";

import {
  Camera,
  Check,
  Loader2,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  useChangePassword,
  useCurrentUser,
  usePreferences,
  useProfile,
  useUpdatePreferences,
  useUpdateProfile,
  useUploadAvatar,
} from "@/features/settings/use-settings";
import { createClient } from "@/lib/supabase/client";
import { optimizeImage } from "@/lib/image-optimizer";


export function SettingsPage() {
  const router = useRouter();
  const client = useMemo(() => createClient(), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const profile = useProfile();
  const preferences = usePreferences();
  const currentUser = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const updatePreferences = useUpdatePreferences();
  const uploadAvatar = useUploadAvatar();
  const passwordMutation = useChangePassword();
  const [draftName, setDraftName] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const name = draftName ?? profile.data?.display_name ?? "";

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.length > 50) {
      toast.error("O nome não pode ter mais de 50 caracteres.");
      return;
    }
    if (!/^[^\s]+\s+[^\s]+$/.test(trimmed)) {
      toast.error("Informe apenas nome e sobrenome (duas palavras).");
      return;
    }
    try {
      await updateProfile.mutateAsync({ display_name: trimmed });
      setDraftName(null);
      toast.success("Perfil salvo.");
    } catch {
      toast.error("Não foi possível salvar o perfil.");
    }
  }

  async function handleAvatar(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5 MB antes da otimização.");
      return;
    }
    
    const loadingToast = toast.loading("Otimizando e enviando foto...");
    try {
      const optimizedFile = await optimizeImage(file);
      await uploadAvatar.mutateAsync(optimizedFile);
      toast.success("Foto atualizada com sucesso!", { id: loadingToast });
    } catch {
      toast.error("Não foi possível enviar a foto.", { id: loadingToast });
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }



  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Use pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    try {
      await passwordMutation.mutateAsync(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada.");
    } catch {
      toast.error("Não foi possível alterar a senha.");
    }
  }

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) {
      toast.error("Não foi possível sair.");
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  if (profile.isLoading || preferences.isLoading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="sr-only">Carregando configurações</span>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste sua conta e a experiência do Flowy.
        </p>
      </header>

      <div className="space-y-10">
        <section aria-labelledby="profile-heading">
          <h2 id="profile-heading" className="text-base font-semibold">
            Perfil
          </h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-lg font-semibold text-muted-foreground">
              {profile.data?.avatar_url ? (
                <Image
                  src={profile.data.avatar_url}
                  alt="Foto do perfil"
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                (profile.data?.display_name || currentUser.data?.email || "F")
                  .slice(0, 1)
                  .toUpperCase()
              )}
            </div>
            <div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => handleAvatar(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploadAvatar.isPending}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-input px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {uploadAvatar.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                Alterar foto
              </button>
              <p className="mt-1 text-xs text-muted-foreground">
                Qualquer imagem até 5 MB (será otimizada).
              </p>
            </div>
          </div>
          <form onSubmit={saveName} className="mt-5 max-w-md">
            <label
              htmlFor="profile-name"
              className="mb-1.5 block text-sm font-medium"
            >
              Nome
            </label>
            <div className="flex gap-2">
              <input
                id="profile-name"
                value={name}
                onChange={(event) => setDraftName(event.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                autoComplete="name"
                maxLength={50}
              />
              <button
                disabled={!name.trim() || updateProfile.isPending}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {updateProfile.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}{" "}
                Salvar
              </button>
            </div>
          </form>
        </section>



        <section
          className="border-t border-border pt-8"
          aria-labelledby="preferences-heading"
        >
          <h2 id="preferences-heading" className="text-base font-semibold">
            Preferências
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Visão inicial de tarefas
              <select
                value={preferences.data?.default_task_view ?? "all"}
                onChange={(event) =>
                  updatePreferences.mutate({
                    default_task_view: event.target.value as
                      "all" | "today" | "upcoming",
                  })
                }
                className="mt-1.5 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Todas</option>
                <option value="today">Hoje</option>
                <option value="upcoming">Próximas</option>
              </select>
            </label>
          </div>
        </section>

        <section
          className="border-t border-border pt-8"
          aria-labelledby="account-heading"
        >
          <h2 id="account-heading" className="text-base font-semibold">
            Conta
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentUser.data?.email}
          </p>
          <form onSubmit={updatePassword} className="mt-5 max-w-md space-y-3">
            <label className="block text-sm font-medium" htmlFor="new-password">
              Nova senha
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <label
              className="block text-sm font-medium"
              htmlFor="confirm-password"
            >
              Confirmar nova senha
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              disabled={passwordMutation.isPending || !newPassword}
              className="min-h-10 rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              Alterar senha
            </button>
          </form>
          <button
            type="button"
            onClick={signOut}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="size-4" /> Sair da conta
          </button>
        </section>
      </div>
    </div>
  );
}
