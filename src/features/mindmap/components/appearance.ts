import type {
  LayoutKind,
  ThemeDef,
  Topic,
  TopicShape,
} from "@/features/mindmap/types";
import { resolveShape } from "@/features/mindmap/components/measure";

export interface TopicAppearance {
  shape: TopicShape;
  fill: string;
  color: string;
  border: string;
}

const TRANSPARENT = "transparent";

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.replace(/(.)/g, "$1$1") : value;
  const channel = (offset: number) => {
    const c = parseInt(full.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  if (!/^[0-9a-f]{6}$/i.test(full)) return 1;
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

export function readableOn(fill: string): string {
  return luminance(fill) > 0.45 ? "#111827" : "#FFFFFF";
}

function baseFill(depth: number, theme: ThemeDef, branch: string): string {
  if (depth === 0) return theme.root.fill;
  if (depth === 1) return branch;
  return theme.topic.fill;
}

export function topicAppearance(
  topic: Topic,
  depth: number,
  branch: string,
  theme: ThemeDef,
  layout: LayoutKind,
  darkCanvas: boolean,
): TopicAppearance {
  const shape = resolveShape(topic, depth, layout);
  const bare = shape === "underline" || shape === "none";
  const fill =
    topic.style?.fill ?? (bare ? TRANSPARENT : baseFill(depth, theme, branch));
  const autoColor =
    fill === TRANSPARENT
      ? darkCanvas
        ? "#F3F4F6"
        : "#1F2937"
      : depth === 0 && !topic.style?.fill
        ? theme.root.color
        : depth >= 2 && !topic.style?.fill
          ? theme.topic.color
          : readableOn(fill);
  return {
    shape,
    fill,
    color: topic.style?.color ?? autoColor,
    border:
      shape === "underline"
        ? branch
        : depth >= 2
          ? theme.topic.border
          : TRANSPARENT,
  };
}
