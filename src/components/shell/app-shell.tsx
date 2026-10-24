"use client";

import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { MobileNav } from "@/components/shell/mobile-nav";
import { Sidebar, type ShellFolder, type ShellCategory, type ShellUser } from "@/components/shell/sidebar";
import { RealtimeSync } from "@/components/system/realtime-sync";
import { GlobalTaskComposer } from "@/components/system/global-task-composer";
import { GlobalCreateButton } from "@/components/system/global-create-button";
import { GlobalOrganizer } from "@/components/system/global-organizer";
import { GlobalInstallPrompt } from "@/components/system/global-install-prompt";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { categoryKeys, useCategories } from "@/features/categories/use-categories";
import { folderKeys, useFolders } from "@/features/folders/use-folders";
import { syncPushSubscription } from "@/features/settings/use-push-notifications";
import { useProfile } from "@/features/settings/use-settings";
import { taskKeys } from "@/features/tasks/query-keys";
import { useOpenTaskCounts } from "@/features/tasks/use-tasks";
import { useDeviceCache } from "@/lib/device-cache";
import { cn, getInitials } from "@/lib/utils";
import { holdOverlay } from "@/lib/overlay";

interface AppShellProps {
  children: ReactNode;
  userId?: string;
  user?: ShellUser;
  /** The account already finished (or skipped) the tour. */
  onboarded?: boolean;
}

// Only new accounts (or "Como funciona") see the tour: load it just then.
const OnboardingTour = dynamic(
  () => import("@/components/system/onboarding-tour").then((mod) => mod.OnboardingTour),
  { ssr: false },
);

const fallbackUser: ShellUser = { name: "Usuário", email: "" };
const sidebarStorageKey = "flowy:sidebar-collapsed";
const sidebarChangeEvent = "flowy:sidebar-change";

function subscribeSidebar(callback: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === sidebarStorageKey) callback();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(sidebarChangeEvent, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(sidebarChangeEvent, callback);
  };
}

function getSidebarSnapshot() {
  return window.localStorage.getItem(sidebarStorageKey) === "true";
}

export function AppShell({
  children,
  userId,
  user = fallbackUser,
  onboarded = true,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isNoteEditor = /^\/app\/notes\/[^/]+$/.test(pathname);
  const replayTour = useSearchParams().get("tour") === "1";
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    () => false,
  );
  const [mobileMenu, setMobileMenu] = useState({ open: false, pathname: "" });
  const mobileOpen = mobileMenu.open && mobileMenu.pathname === pathname;
  const foldersQuery = useFolders();
  const categoriesQuery = useCategories();
  const profileQuery = useProfile();
  const countsQuery = useOpenTaskCounts();
  useDeviceCache("folders", userId, folderKeys.list(), foldersQuery.data);
  useDeviceCache("categories", userId, categoryKeys.list(), categoriesQuery.data);
  useDeviceCache("profile", userId, ["profile"], profileQuery.data);
  useDeviceCache("task-counts", userId, taskKeys.counts(), countsQuery.data);
  // New accounts with nothing to do yet get the tour, once the count is known.
  const showOnboarding = !onboarded && countsQuery.data?.total === 0;
  const shellUser = useMemo(
    () => ({
      ...user,
      name: profileQuery.data?.display_name || user.name,
      avatarUrl: profileQuery.data?.avatar_url ?? user.avatarUrl,
    }),
    [profileQuery.data, user],
  );
  const sidebarFolders = useMemo<ShellFolder[]>(
    () =>
      (foldersQuery.data ?? []).map((folder) => ({
        id: folder.id,
        name: folder.name,
        color: folder.color,
        icon: folder.icon,
        parent_id: folder.parent_id,
        task_count: countsQuery.data?.byFolder[folder.id] ?? 0,
      })),
    [foldersQuery.data, countsQuery.data],
  );
  const sidebarCategories = useMemo<ShellCategory[]>(
    () =>
      (categoriesQuery.data ?? []).map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        task_count: countsQuery.data?.byCategory[category.id] ?? 0,
      })),
    [categoriesQuery.data, countsQuery.data],
  );

  useEffect(() => {
    // After startup settles, so it never competes with the first paint.
    const timeout = window.setTimeout(() => {
      syncPushSubscription().catch(() => {
        // Offline or blocked: tried again the next time the app opens.
      });
      // Warm the task composer's code so the first "+" opens instantly.
      void import("@/features/tasks/components/task-composer");
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";
    const release = holdOverlay();
    return () => {
      document.body.style.overflow = "";
      release();
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenu((current) => ({ ...current, open: false }));
      }

      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;

      const target = event.target as HTMLElement | null;
      const editing =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";
      if (event.key.toLowerCase() === "n" && !editing) {
        event.preventDefault();
        window.dispatchEvent(new Event("flowy:open-task-composer"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const toggleSidebar = () => {
    window.localStorage.setItem(sidebarStorageKey, String(!collapsed));
    window.dispatchEvent(new Event(sidebarChangeEvent));
  };

  const closeMobileMenu = () =>
    setMobileMenu((current) => ({ ...current, open: false }));

  return (
    <div className="relative flex h-dvh overflow-hidden bg-background">
      {/* --- AMBIENT PREMIUM BACKGROUND --- */}
      <div className="theme-ambient pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Micro-dot grid pattern for texture and scale */}
        <div 
          className="absolute inset-0 opacity-[0.15] mix-blend-screen" 
          style={{ 
            backgroundImage: `radial-gradient(circle at center, rgba(255,255,255,0.8) 1px, transparent 1px)`, 
            backgroundSize: "32px 32px" 
          }}
        />
        
        {/* Floating Glowing Orbs for depth */}
        <div className="absolute -left-[10%] -top-[10%] h-[40vw] w-[40vw] rounded-full bg-primary/20 blur-[120px] transition-transform duration-[10000ms] hover:scale-110" />
        <div className="absolute -right-[5%] top-[20%] h-[30vw] w-[30vw] rounded-full bg-indigo-500/15 blur-[120px]" />
        <div className="absolute -bottom-[15%] left-[15%] h-[50vw] w-[50vw] rounded-full bg-purple-600/15 blur-[150px]" />
        
        {/* Vignette mask to keep edges dark and center readable */}
        <div className="absolute inset-0 bg-background/60 bg-[radial-gradient(circle_at_center,_transparent_0%,_var(--tw-gradient-stops)_100%)] from-transparent to-background/90" />
      </div>
      {/* -------------------------------- */}

      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:translate-y-0"
      >
        Ir para o conteúdo
      </a>

      <aside
        data-tour="nav"
        className={cn(
          "theme-shell-panel relative z-10 hidden shrink-0 border-r border-border/50 transition-[width] duration-200 md:block",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <Sidebar
          collapsed={collapsed}
          folders={sidebarFolders}
          categories={sidebarCategories}
          user={shellUser}
          onToggle={toggleSidebar}
        />
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {!isNoteEditor ? (
          <header className="flowy-mobile-header flowy-glass flowy-glass-strong absolute inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b px-4 md:hidden">
            <Logo className="text-base" />
            {/* Your photo opens the side menu: profile, folders and labels. */}
            <button
              type="button"
              onClick={() => setMobileMenu({ open: true, pathname })}
              aria-label="Abrir menu"
              aria-expanded={mobileOpen}
              className="grid size-9 place-items-center rounded-full bg-accent bg-cover bg-center text-[11px] font-bold ring-2 ring-border/60 transition-transform active:scale-90"
              style={shellUser.avatarUrl ? { backgroundImage: `url(${shellUser.avatarUrl})` } : undefined}
            >
              {shellUser.avatarUrl ? null : getInitials(shellUser.name)}
            </button>
          </header>
        ) : null}

        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            "scrollbar-thin min-w-0 flex-1 overflow-x-hidden",
            isNoteEditor
              ? "overflow-hidden p-0"
              : "overflow-y-auto overscroll-y-contain px-4 pb-32 pt-[4.75rem] sm:px-6 md:px-8 md:py-12 md:pb-8",
          )}
        >
          <div
            key={pathname}
            className={cn(
              "app-page-transition mx-auto w-full max-w-[1600px]",
              isNoteEditor && "h-full max-w-none",
            )}
          >
            {children}
          </div>
        </main>
      </div>

      {!isNoteEditor ? (
        <MobileNav />
      ) : null}
      <RealtimeSync />
      <GlobalTaskComposer />
      {!isNoteEditor ? <GlobalCreateButton /> : null}
      <GlobalOrganizer />
      <GlobalInstallPrompt />
      {(showOnboarding || replayTour) && pathname === "/app" ? (
        <OnboardingTour
          name={shellUser.name.split(/\s+/)[0] || shellUser.name}
          replay={replayTour}
          onClose={replayTour ? () => router.replace("/app") : undefined}
        />
      ) : null}

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            type="button"
            className="flowy-glass-scrim absolute inset-0 animate-fade-in"
            aria-label="Fechar menu"
            onClick={closeMobileMenu}
          />
          <aside
            id="mobile-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="theme-shell-panel absolute inset-y-0 left-0 w-[min(88vw,320px)] animate-[flowy-menu-enter_260ms_cubic-bezier(.22,1,.36,1)] border-r border-border shadow-soft"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-3 z-10"
              onClick={closeMobileMenu}
              aria-label="Fechar menu"
              autoFocus
            >
              <X className="size-5" aria-hidden="true" />
            </Button>
            <Sidebar
              mobile
              folders={sidebarFolders}
              categories={sidebarCategories}
              user={shellUser}
              onNavigate={closeMobileMenu}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
