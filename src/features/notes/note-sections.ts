import type { NoteKind } from "@/types/content";

/** The three separate content areas, picked with `?tipo=` on /app/notes. */
export type NoteSection = "nota" | "mapa" | "desenho";

export const SECTION_KIND: Record<NoteSection, NoteKind> = {
  nota: "text",
  mapa: "mindmap",
  desenho: "excalidraw",
};

export const SECTION_HREF: Record<NoteSection, string> = {
  nota: "/app/notes?tipo=nota",
  mapa: "/app/notes?tipo=mapa",
  desenho: "/app/notes?tipo=desenho",
};

/** Query param that opens the "new" flow of a section right away. */
export const NEW_PARAM = "novo";

/** Unknown or missing values fall back to notes; "fluxo" is the old maps link. */
export function parseSection(value: string | null): NoteSection {
  if (value === "mapa" || value === "fluxo") return "mapa";
  if (value === "desenho") return "desenho";
  return "nota";
}
