"use client";

import {
  Camera,
  Check,
  Loader2,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { optimizeImage } from "@/lib/image-optimizer";
import { DeleteAccountButton } from "@/components/auth/delete-account-button";
import { normalizeThemePreference } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import type { ThemePreference } from "@/types/content";

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  description: string;
}> = [
  {
    value: "purple",
    label: "Roxo",
    description: "O visual original do Flowy, com profundidade violeta.",
  },
  {
    value: "black",
    label: "Preto",
    description: "Monocromático e discreto, com contraste alto.",
  },
  {
    value: "oled",
    label: "Preto OLED",
    description: "Preto absoluto para telas OLED, com menor consumo de energia.",
  },
  {
    value: "white",
    label: "Branco",
    description: "Claro, limpo e focado no conteúdo.",
  },
];

function ThemePreview({ theme, selected }: { theme: ThemePreference; selected: boolean }) {
  const isPurple = theme === "purple";
  const isBlack = theme === "black";
  const isOled = theme === "oled";

  const bgApp = isPurple ? "bg-[#0d041e]" : isOled ? "bg-black" : isBlack ? "bg-[#000000]" : "bg-[#f5f5f5]";
  const bgSidebar = isPurple ? "bg-[#180a33]" : isOled ? "bg-black" : isBlack ? "bg-[#0a0a0a]" : "bg-white";
  const bgCard = isPurple ? "bg-[#210d47]" : isOled ? "bg-black" : isBlack ? "bg-[#141414]" : "bg-white";
  const primary = isPurple ? "bg-[#7c3aed]" : isBlack || isOled ? "bg-white" : "bg-[#171717]";
  const border = isPurple ? "border-[#311561]" : isOled ? "border-[#242424]" : isBlack ? "border-[#262626]" : "border-[#e5e5e5]";
  const textMuted = isPurple ? "bg-[#6d28d9]/40" : isBlack || isOled ? "bg-white/20" : "bg-black/20";
  const textTitle = isPurple ? "bg-[#c4b5fd]" : isBlack || isOled ? "bg-white/80" : "bg-black/80";
  const plusColor = isBlack || isOled ? "bg-black" : "bg-white";

  return (
    <div
      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${border} ${bgApp} transition-all duration-300 ${
        selected ? "scale-100 ring-2 ring-primary ring-offset-2 ring-offset-background" : "scale-[0.98] group-hover:scale-100"
      }`}
      aria-hidden="true"
    >
      <div className="flex h-full w-full">
        {/* Sidebar */}
        <div className={`flex w-1/3 flex-col gap-1 border-r p-1 ${border} ${bgSidebar}`}>
          <div className={`h-2 w-3/4 rounded-full opacity-80 ${primary}`} />
          <div className="mt-2 space-y-1.5">
            <div className={`h-1.5 w-full rounded-full ${textMuted}`} />
            <div className={`h-1.5 w-5/6 rounded-full ${textMuted}`} />
            <div className={`h-1.5 w-4/6 rounded-full ${textMuted}`} />
          </div>
        </div>
        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-1 p-1.5">
          {/* Header */}
          <div className={`h-2.5 w-1/2 rounded-full ${textTitle}`} />
          {/* Tasks */}
          <div className="mt-0.5 flex flex-col gap-1">
            <div className={`flex items-center gap-1.5 rounded-md border p-1.5 ${border} ${bgCard}`}>
              <div className={`size-2.5 shrink-0 rounded-sm ${primary}`} />
              <div className={`h-1.5 w-full rounded-full ${textTitle}`} />
            </div>
            <div className={`flex items-center gap-1.5 rounded-md border p-1.5 ${border} ${bgCard}`}>
              <div className={`size-2.5 shrink-0 rounded-sm border ${border}`} />
              <div className={`h-1.5 w-4/5 rounded-full ${textMuted}`} />
            </div>
          </div>
        </div>
      </div>
      {/* Floating Action Button */}
      <div className={`absolute bottom-1 right-1 flex size-3 items-center justify-center rounded-full shadow-sm ${primary}`}>
        <div className={`h-1.5 w-0.5 rounded-full ${plusColor}`} />
        <div className={`absolute h-0.5 w-1.5 rounded-full ${plusColor}`} />
      </div>
      <p className="mt-10 text-center text-[10px] font-medium tracking-wide text-muted-foreground/60">
        Flowy · versão 0.1.0
      </p>
    </div>
  );
}

export function SettingsPage() {
  const router = useRouter();
  const { setTheme } = useTheme();
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
  const savedTheme = normalizeThemePreference(preferences.data?.theme);
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>("purple");

  const name = draftName ?? profile.data?.display_name ?? "";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedTheme(savedTheme);
  }, [savedTheme]);

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

  async function changeTheme(nextTheme: ThemePreference) {
    if (nextTheme === selectedTheme || updatePreferences.isPending) return;

    const previousTheme = selectedTheme;
    setSelectedTheme(nextTheme);
    setTheme(nextTheme);

    try {
      await updatePreferences.mutateAsync({ theme: nextTheme });
      toast.success("Tema atualizado.");
    } catch {
      setSelectedTheme(previousTheme);
      setTheme(previousTheme);
      toast.error("Não foi possível salvar o tema.");
    }
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
          aria-labelledby="theme-heading"
        >
          <h2 id="theme-heading" className="text-base font-semibold">
            Tema
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha a aparência que você quer usar no Flowy.
          </p>
          <div
            className="mt-4 grid gap-2 sm:grid-cols-2"
            role="group"
            aria-label="Escolher tema"
          >
            {themeOptions.map((option) => {
              const selected = selectedTheme === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => changeTheme(option.value)}
                  disabled={updatePreferences.isPending}
                  aria-pressed={selected}
                  className={`group flex items-center gap-3 rounded-lg border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:border-border hover:bg-accent/50"
                  }`}
                >
                  <ThemePreview theme={option.value} selected={selected} />
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                    {selected ? (
                      <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
                        <Check className="size-3" aria-hidden="true" />
                        <span className="sr-only">Selecionado</span>
                      </span>
                    ) : null}
                </button>
              );
            })}
          </div>
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
          <div className="mt-3">
            <DeleteAccountButton showLabel />
          </div>
        </section>
      </div>
    </div>
  );
}
