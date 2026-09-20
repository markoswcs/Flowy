"use client";

import {
  ChevronDown,
  ChevronRight,
  Folder,
  LogOut,
  MoreVertical,
  Plus,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { signOutAction } from "@/app/(auth)/actions";
import { NavLink } from "@/components/shell/nav-link";
import {
  mainNavigation,
  secondaryNavigation,
} from "@/components/shell/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { cn, getInitials } from "@/lib/utils";

export interface ShellFolder {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  task_count?: number;
  parent_id?: string | null;
}

export interface ShellCategory {
  id: string;
  name: string;
  color?: string | null;
  task_count?: number;
}

export interface ShellUser {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface SidebarProps {
  collapsed?: boolean;
  folders: ShellFolder[];
  categories?: ShellCategory[];
  user: ShellUser;
  onToggle?: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}

export function Sidebar({
  collapsed = false,
  folders,
  categories = [],
  user,
  onToggle,
  onNavigate,
  mobile = false,
}: SidebarProps) {
  const pathname = usePathname();
  const [isFoldersOpen, setIsFoldersOpen] = useState(true);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    () => new Set(),
  );

  const foldersByParent = useMemo(() => {
    const grouped = new Map<string | null, ShellFolder[]>();
    folders.forEach((folder) => {
      const parentId = folder.parent_id ?? null;
      grouped.set(parentId, [...(grouped.get(parentId) ?? []), folder]);
    });
    return grouped;
  }, [folders]);

  const folderCount = (folder: ShellFolder): number =>
    (folder.task_count ?? 0) +
    (foldersByParent.get(folder.id) ?? []).reduce(
      (total, child) => total + folderCount(child),
      0,
    );

  const toggleFolder = (folderId: string) => {
    setExpandedFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const renderFolder = (folder: ShellFolder, depth = 0) => {
    const children = foldersByParent.get(folder.id) ?? [];
    const expanded = expandedFolderIds.has(folder.id);
    const href = `/app/folders/${folder.id}`;
    const active = pathname === href;
    const count = folderCount(folder);

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "group flex min-h-11 items-center rounded-2xl border transition-all duration-300 hover:scale-[1.01]",
            active
              ? "border-primary/30 bg-primary/10 text-foreground shadow-[0_0_18px_hsl(var(--primary)/0.16)]"
              : "border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground",
          )}
          style={{ marginLeft: depth * 18 }}
        >
          {children.length ? (
            <button
              type="button"
              onClick={() => toggleFolder(folder.id)}
              className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-accent"
              aria-label={`${expanded ? "Recolher" : "Expandir"} ${folder.name}`}
              aria-expanded={expanded}
            >
              {expanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
          ) : (
            <span className="w-8 shrink-0" />
          )}
          <Link
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className="flex min-w-0 flex-1 items-center gap-3 py-2 pr-2 focus-visible:outline-none"
          >
            <Folder
              className="size-5 shrink-0"
              style={{ color: folder.color || undefined }}
              aria-hidden="true"
            />
            <span className={cn("min-w-0 flex-1 truncate", active && "font-semibold")}>
              {folder.name}
            </span>
            {count > 0 ? (
              <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground/80 transition-colors group-hover:bg-white/10 group-hover:text-foreground">
                {count}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={() => openOrganizer("folders", folder.id)}
            className="mr-1 grid size-8 shrink-0 place-items-center rounded-lg hover:bg-accent focus-visible:outline-none"
            aria-label={`Editar ${folder.name}`}
            title={`Editar ${folder.name}`}
          >
            <MoreVertical className="size-4" />
          </button>
        </div>
        {expanded ? children.map((child) => renderFolder(child, depth + 1)) : null}
      </div>
    );
  };

  const openOrganizer = (target: "folders" | "categories", editId?: string) => {
    window.dispatchEvent(
      new CustomEvent("flowy:open-organizer", { detail: { target, editId } }),
    );
    onNavigate?.();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border/50 px-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <Logo compact={collapsed} onClick={onNavigate} />
        {!collapsed && !mobile ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label="Recolher barra lateral"
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="size-4 rotate-90" aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      <nav
        aria-label="Navegação principal"
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-4"
      >
        <div className="space-y-1">
          {mainNavigation.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {!collapsed ? (
          <>
            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between px-2">
                <button
                  type="button"
                  onClick={() => setIsFoldersOpen(!isFoldersOpen)}
                  className="flex flex-1 items-center gap-1.5 px-1 py-1 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:text-foreground focus-visible:outline-none rounded-sm transition-colors"
                >
                  {isFoldersOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                  Pastas
                </button>
                <button
                  type="button"
                  onClick={() => openOrganizer("folders")}
                  className="flex size-7 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all duration-300 hover:scale-110 hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Nova pasta"
                  title="Nova pasta"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                </button>
              </div>
              
              <div
                className={cn(
                  "space-y-0.5 overflow-hidden transition-all duration-300 px-3 -mx-3 py-1 -my-1",
                  isFoldersOpen ? "max-h-[1000px] opacity-100 mt-2" : "max-h-0 opacity-0"
                )}
              >
                {(foldersByParent.get(null) ?? []).map((folder) =>
                  renderFolder(folder),
                )}
                {folders.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    Nenhuma pasta ainda.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between px-2">
                <button
                  type="button"
                  onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                  className="flex flex-1 items-center gap-1.5 px-1 py-1 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:text-foreground focus-visible:outline-none rounded-sm transition-colors"
                >
                  {isCategoriesOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                  Tags
                </button>
                <button
                  type="button"
                  onClick={() => openOrganizer("categories")}
                  className="flex size-7 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all duration-300 hover:scale-110 hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Nova tag"
                  title="Nova tag"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                </button>
              </div>

              <div
                className={cn(
                  "space-y-0.5 overflow-hidden transition-all duration-300 px-3 -mx-3 py-1 -my-1",
                  isCategoriesOpen ? "max-h-[1000px] opacity-100 mt-2" : "max-h-0 opacity-0"
                )}
              >
                {categories.map((category) => {
                  const href = `/app/categories/${category.id}`;
                  const active = pathname === href;
                  return (
                    <div key={category.id} className="relative group flex items-center">
                      <Link
                        href={href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex min-h-[40px] flex-1 items-center gap-3 rounded-2xl px-3 text-[13px] transition-all duration-300 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent",
                          active
                            ? "bg-primary/10 text-foreground font-medium shadow-[0_0_15px_rgba(var(--primary),0.15)] border-primary/30"
                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        )}
                        style={
                          active && category.color
                            ? {
                                backgroundColor: `${category.color}15`,
                                color: category.color,
                                borderColor: `${category.color}50`,
                              }
                            : {}
                        }
                      >
                        <Tag
                          className="size-4 shrink-0"
                          style={{ color: category.color || undefined }}
                          aria-hidden="true"
                        />
                        <span className="truncate flex-1 font-medium">{category.name}</span>
                        <span className="shrink-0 ml-2 min-w-6 rounded-full bg-white/5 px-2 py-0.5 text-center text-xs font-semibold tabular-nums text-muted-foreground/80 transition-colors group-hover:bg-white/10 group-hover:text-foreground">
                          {category.task_count ?? 0}
                        </span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}

        <div className={cn("mt-8 space-y-0.5", collapsed && "mt-5")}>
          {secondaryNavigation.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/5 p-4 bg-transparent">
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/app/settings"
              className="flex size-9 items-center justify-center rounded-full bg-accent text-[11px] font-bold shadow-soft focus-visible:ring-2 focus-visible:ring-ring"
              title={user.name}
            >
              {getInitials(user.name)}
            </Link>
            {!mobile ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onToggle}
                aria-label="Expandir barra lateral"
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="size-4 -rotate-90" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/app/settings"
              onClick={onNavigate}
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-300 hover:scale-[1.02] border border-transparent hover:border-white/5 hover:shadow-lg"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent bg-cover bg-center text-[11px] font-bold shadow-sm"
                style={
                  user.avatarUrl
                    ? { backgroundImage: `url(${user.avatarUrl})` }
                    : undefined
                }
                aria-hidden="true"
              >
                {user.avatarUrl ? null : getInitials(user.name)}
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {user.name}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground font-medium">
                  {user.email}
                </span>
              </span>
            </Link>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                title="Sair"
                aria-label="Sair da conta"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/20 hover:scale-110 transition-all duration-300 rounded-full"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
