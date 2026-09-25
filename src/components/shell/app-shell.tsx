"use client";

import { X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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
import { useCategories } from "@/features/categories/use-categories";
import { useFolders } from "@/features/folders/use-folders";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  folders?: ShellFolder[];
  categories?: ShellCategory[];
  user?: ShellUser;
}

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
  folders = [],
  categories = [],
  user = fallbackUser,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    () => false,
  );
  const [mobileMenu, setMobileMenu] = useState({ open: false, pathname: "" });
  const mobileOpen = mobileMenu.open && mobileMenu.pathname === pathname;
  const foldersQuery = useFolders();
  const categoriesQuery = useCategories();
  const sidebarFolders = useMemo(() => {
    if (!foldersQuery.data) return folders;
    const taskCounts = new Map(
      folders.map((folder) => [folder.id, folder.task_count]),
    );
    return foldersQuery.data.map((folder) => ({
      id: folder.id,
      name: folder.name,
      color: folder.color,
      icon: folder.icon,
      parent_id: folder.parent_id,
      task_count: taskCounts.get(folder.id) ?? 0,
    }));
  }, [folders, foldersQuery.data]);
  const sidebarCategories = useMemo(() => {
    if (!categoriesQuery.data) return categories;
    const taskCounts = new Map(
      categories.map((category) => [category.id, category.task_count]),
    );
    return categoriesQuery.data.map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      task_count: taskCounts.get(category.id) ?? 0,
    }));
  }, [categories, categoriesQuery.data]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("has-overlay");
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("has-overlay");
    }
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("has-overlay");
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
        className={cn(
          "theme-shell-panel relative z-10 hidden shrink-0 border-r border-border/50 transition-[width] duration-200 md:block",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <Sidebar
          collapsed={collapsed}
          folders={sidebarFolders}
          categories={sidebarCategories}
          user={user}
          onToggle={toggleSidebar}
        />
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="theme-shell-panel relative z-40 flex h-16 shrink-0 items-center justify-center border-b border-border/50 px-3 md:hidden">
          <Logo />
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="scrollbar-thin min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 pb-24 sm:px-6 md:px-8 md:py-12 md:pb-8"
        >
          <div key={pathname} className="app-page-transition mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>

      <MobileNav onOpenMenu={() => setMobileMenu({ open: true, pathname })} />
      <RealtimeSync />
      <GlobalTaskComposer />
      <GlobalCreateButton />
      <GlobalOrganizer />
      <GlobalInstallPrompt />

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 animate-fade-in bg-background/95"
            aria-label="Fechar menu"
            onClick={closeMobileMenu}
          />
          <aside
            id="mobile-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="theme-shell-panel absolute inset-y-0 left-0 w-[min(88vw,320px)] animate-in slide-in-from-left-4 duration-300 border-r border-border shadow-soft"
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
              user={user}
              onNavigate={closeMobileMenu}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
