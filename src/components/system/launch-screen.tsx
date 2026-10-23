"use client";

import { useEffect, useState } from "react";

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

/** Shortest time, from app launch, the screen stays up so it never just flickers. */
const MIN_VISIBLE_MS = 300;
const FADE_MS = 220;

/**
 * Opening screen of the installed app. It picks up where the system splash
 * (icon, name and colour from the manifest, which cannot show anything else)
 * leaves off: same background and logo, plus the name, the version and a
 * light progress line until the app is ready. CSS shows it only in
 * standalone mode, and only on a full page load: in-app navigation keeps the
 * root layout mounted, so it never comes back.
 */
export function LaunchScreen() {
  const [phase, setPhase] = useState<"visible" | "leaving" | "gone">("visible");

  useEffect(() => {
    const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
    const leave = window.setTimeout(() => setPhase("leaving"), wait);
    const remove = window.setTimeout(() => setPhase("gone"), wait + FADE_MS);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(remove);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      className="flowy-launch"
      data-leaving={phase === "leaving" || undefined}
      aria-hidden="true"
    >
      <div className="flowy-launch-center">
        <span className="flowy-launch-halo" />
        {/* eslint-disable-next-line @next/next/no-img-element -- must paint before hydration */}
        <img
          src="/icon-192.png"
          alt=""
          width={84}
          height={84}
          className="flowy-launch-logo"
        />
        <p className="flowy-launch-name">Flowy</p>
        <p className="flowy-launch-tagline">Sua mente, em fluxo</p>
        <span className="flowy-launch-progress">
          <span />
        </span>
      </div>
      {VERSION ? <p className="flowy-launch-version">v{VERSION}</p> : null}
    </div>
  );
}
