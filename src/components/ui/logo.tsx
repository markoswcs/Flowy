import Link from "next/link";
import Image from "next/image";
import type { MouseEventHandler } from "react";

import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  className,
  onClick,
}: {
  compact?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      href="/app"
      className={cn(
        "inline-flex items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={onClick}
      aria-label="Flowy — início"
    >
      <Image
        src="/logo.png"
        alt="Flowy Logo"
        width={32}
        height={32}
        className="shrink-0 object-contain rounded-[10px]"
      />
      {compact ? null : <span className="text-lg">Flowy</span>}
    </Link>
  );
}
