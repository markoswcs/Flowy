import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_20%_15%,hsl(var(--primary)/0.22),transparent_70%),radial-gradient(40%_35%_at_85%_90%,rgb(99_102_241/0.16),transparent_70%)]"
      />
      <Link
        href="/"
        className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:left-6 sm:top-6"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Início
      </Link>
      <div className="w-full max-w-sm animate-fade-in rounded-[2rem] border border-border/60 bg-card/60 p-6 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)] backdrop-blur-xl sm:p-8">
        <div className="mb-7 flex justify-center">
          <Logo href="/" />
        </div>
        {children}
      </div>
    </main>
  );
}
