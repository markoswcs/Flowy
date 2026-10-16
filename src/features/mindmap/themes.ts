import type { ThemeDef, ThemeId } from "@/features/mindmap/types";

export const THEMES: Record<ThemeId, ThemeDef> = {
  flowy: {
    id: "flowy",
    label: "Flowy",
    branches: [
      "#2563EB",
      "#DB2777",
      "#047857",
      "#B45309",
      "#0E7490",
      "#DC2626",
      "#9333EA",
      "#4D7C0F",
    ],
    root: { fill: "#7C3AED", color: "#FFFFFF" },
    topic: { fill: "#FFFFFF", color: "#1F2937", border: "#DDD6FE" },
    canvas: { light: "#F8F7FF", dark: "#14121F" },
  },
  classic: {
    id: "classic",
    label: "Clássico",
    branches: [
      "#2563EB",
      "#15803D",
      "#DC2626",
      "#A16207",
      "#7C3AED",
      "#0F766E",
      "#C2410C",
    ],
    root: { fill: "#1F2937", color: "#FFFFFF" },
    topic: { fill: "#FFFFFF", color: "#111827", border: "#D1D5DB" },
    canvas: { light: "#FFFFFF", dark: "#111827" },
  },
  ocean: {
    id: "ocean",
    label: "Oceano",
    branches: [
      "#0369A1",
      "#0E7490",
      "#0F766E",
      "#1D4ED8",
      "#4338CA",
      "#155E75",
      "#1E40AF",
    ],
    root: { fill: "#0C4A6E", color: "#FFFFFF" },
    topic: { fill: "#F0F9FF", color: "#0C4A6E", border: "#BAE6FD" },
    canvas: { light: "#F0F9FF", dark: "#08202F" },
  },
  sunset: {
    id: "sunset",
    label: "Pôr do sol",
    branches: [
      "#C2410C",
      "#BE185D",
      "#B45309",
      "#DC2626",
      "#9D174D",
      "#A21CAF",
      "#9A3412",
    ],
    root: { fill: "#7C2D12", color: "#FFFFFF" },
    topic: { fill: "#FFF7ED", color: "#431407", border: "#FED7AA" },
    canvas: { light: "#FFFBF5", dark: "#24130B" },
  },
  forest: {
    id: "forest",
    label: "Floresta",
    branches: [
      "#15803D",
      "#4D7C0F",
      "#0F766E",
      "#A16207",
      "#047857",
      "#3F6212",
      "#166534",
    ],
    root: { fill: "#14532D", color: "#FFFFFF" },
    topic: { fill: "#F0FDF4", color: "#14532D", border: "#BBF7D0" },
    canvas: { light: "#F7FEF9", dark: "#0C1F13" },
  },
  mono: {
    id: "mono",
    label: "Monocromático",
    branches: [
      "#374151",
      "#52525B",
      "#1F2937",
      "#4B5563",
      "#3F3F46",
      "#27272A",
    ],
    root: { fill: "#111827", color: "#FFFFFF" },
    topic: { fill: "#F9FAFB", color: "#111827", border: "#D1D5DB" },
    canvas: { light: "#FAFAFA", dark: "#0A0A0A" },
  },
};

export function branchColor(theme: ThemeId, index: number): string {
  const branches = (THEMES[theme] ?? THEMES.flowy).branches;
  const i =
    ((Math.trunc(index) % branches.length) + branches.length) % branches.length;
  return branches[i] ?? "#7C3AED";
}
