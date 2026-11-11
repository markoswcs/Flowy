"use client";

import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { classNow, hhmm, inTime } from "./schedule";
import { useClasses } from "./use-classes";

/** "Agora: Anatomia, sala 12 · Próxima: Bioquímica em 40 min". Hidden without classes today. */
export function ClassNowCard() {
  const classes = useClasses();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const { ongoing, next, minutesToNext } = classNow(classes.data ?? [], now);
  if (!ongoing && !next) return null;

  return (
    <Link
      href="/app/classes"
      className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card/50 p-4 transition-colors hover:border-violet-400/50"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-400">
        <GraduationCap className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-sm">
        {ongoing ? (
          <span className="block truncate">
            <span className="font-semibold">Agora: {ongoing.name}</span>
            {ongoing.room ? <span className="text-muted-foreground"> · {ongoing.room}</span> : null}
            <span className="text-muted-foreground"> até {hhmm(ongoing.ends_at)}</span>
          </span>
        ) : null}
        {next ? (
          <span className={ongoing ? "block truncate text-muted-foreground" : "block truncate"}>
            <span className={ongoing ? "" : "font-semibold"}>Próxima: {next.name}</span>
            {" "}às {hhmm(next.starts_at)} ({inTime(minutesToNext!)})
            {next.room ? ` · ${next.room}` : ""}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
