"use client";

import { useEffect, type ReactNode } from "react";

// Nudges the hero's floating cards with two CSS variables on <html>:
// --mx / --my (pointer offset from center, -1..1).
// Elements opt in to reveal-on-scroll with the `data-reveal` attribute.
export function LandingMotion({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const update = () => {
      frame = 0;
      root.style.setProperty("--mx", pointerX.toFixed(3));
      root.style.setProperty("--my", pointerY.toFixed(3));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      pointerY = (event.clientY / window.innerHeight) * 2 - 1;
      schedule();
    };

    // Cards marked data-tilt lean towards the pointer and catch a light.
    const tiltCards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-tilt]"),
    );
    const onTilt = (event: PointerEvent) => {
      const card = event.currentTarget as HTMLElement;
      const box = card.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      card.style.setProperty("--ry", `${((x - 0.5) * 10).toFixed(2)}deg`);
      card.style.setProperty("--rx", `${((0.5 - y) * 8).toFixed(2)}deg`);
      card.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      card.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
      card.style.setProperty("--glow", "1");
    };
    const onLeave = (event: PointerEvent) => {
      const card = event.currentTarget as HTMLElement;
      ["--rx", "--ry", "--glow"].forEach((name) =>
        card.style.removeProperty(name),
      );
    };

    // How far down the page the reader is (0..1), for the bar under the menu.
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      root.style.setProperty(
        "--scroll",
        max > 0 ? (window.scrollY / max).toFixed(4) : "0",
      );
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (!reduce) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      update();
      tiltCards.forEach((card) => {
        card.addEventListener("pointermove", onTilt);
        card.addEventListener("pointerleave", onLeave);
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-revealed", "");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    document.querySelectorAll("[data-reveal]").forEach((element) => {
      if (reduce) element.setAttribute("data-revealed", "");
      else observer.observe(element);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      tiltCards.forEach((card) => {
        card.removeEventListener("pointermove", onTilt);
        card.removeEventListener("pointerleave", onLeave);
      });
      observer.disconnect();
      ["--mx", "--my", "--scroll"].forEach((name) =>
        root.style.removeProperty(name),
      );
    };
  }, []);

  return children;
}
