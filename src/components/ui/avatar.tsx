"use client";

import { useState } from "react";

import { cn, getInitials } from "@/lib/utils";

/**
 * Profile photo that falls back to the initials when the image cannot load
 * (blocked by an ad blocker, VPN, antivirus or a bad connection) instead of
 * leaving an empty circle.
 */
export function Avatar({
  name,
  url,
  className,
}: {
  name: string;
  url?: string | null;
  className?: string;
}) {
  // Remembered per address, so a new photo gets its own try.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(url) && failedUrl !== url;

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-[11px] font-bold",
        className,
      )}
      aria-hidden="true"
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote avatar, sized by CSS, with a fallback
        <img
          src={url!}
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(url ?? null)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
