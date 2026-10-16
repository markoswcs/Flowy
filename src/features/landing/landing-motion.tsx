"use client";

import { useEffect, type ReactNode } from "react";

// Drives the landing page's parallax with three CSS variables on <html>:
// --scroll (px scrolled), --mx / --my (pointer offset from center, -1..1).
// Elements opt in to reveal-on-scroll with the `data-reveal` attribute.
export function LandingMotion({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const update = () => {
      frame = 0;
      root.style.setProperty("--scroll", `${window.scrollY}`);
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

    if (!reduce) {
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("pointermove", onPointer, { passive: true });
      update();
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
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("pointermove", onPointer);
      observer.disconnect();
      ["--scroll", "--mx", "--my"].forEach((name) => root.style.removeProperty(name));
    };
  }, []);

  return children;
}
