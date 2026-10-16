/**
 * Mirrors the visible viewport into CSS variables (`--flow-vv-top`,
 * `--flow-vv-height`) while a full-screen editor is open. On some phones
 * `100dvh` and even `position: fixed; inset: 0` reach under the system or
 * browser bars, which pushed bottom toolbars off screen; `visualViewport` is
 * what the person actually sees (and shrinks with the keyboard).
 */
export function trackVisualViewport(): () => void {
  const root = document.documentElement;
  const viewport = window.visualViewport;

  function update() {
    const height = viewport?.height ?? window.innerHeight;
    const top = viewport?.offsetTop ?? 0;
    root.style.setProperty("--flow-vv-height", `${Math.round(height)}px`);
    root.style.setProperty("--flow-vv-top", `${Math.round(top)}px`);
  }

  update();
  viewport?.addEventListener("resize", update);
  viewport?.addEventListener("scroll", update);
  window.addEventListener("resize", update);
  return () => {
    viewport?.removeEventListener("resize", update);
    viewport?.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
    root.style.removeProperty("--flow-vv-height");
    root.style.removeProperty("--flow-vv-top");
  };
}
