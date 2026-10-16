import type { LayoutKind } from "@/features/mindmap/types";

const PATHS: Record<LayoutKind, string> = {
  mindmap: "M10 12h4M4 6h3l3 6-3 6H4M20 6h-3l-3 6 3 6h3",
  "logic-right": "M3 12h4M7 12l3-6h4M7 12l3 6h4M7 12h7M14 6h6M14 12h6M14 18h6",
  "logic-left":
    "M21 12h-4M17 12l-3-6h-4M17 12l-3 6h-4M17 12h-7M10 6H4M10 12H4M10 18H4",
  org: "M9 3h6v4H9zM12 7v4M5 11h14M5 11v3M12 11v3M19 11v3M3 14h4v4H3zM10 14h4v4h-4zM17 14h4v4h-4z",
  tree: "M4 3h6v4H4zM7 7v13M7 11h4M7 16h4M11 9h8v4h-8zM11 14h8v4h-8z",
  timeline:
    "M2 12h20M5 12V7M12 12v5M19 12V7M3 4h4v3H3zM10 17h4v3h-4zM17 4h4v3h-4z",
  flow: "M8 2h8v4H8zM12 6v3M12 9l4 3-4 3-4-3zM12 15v3M8 18h8v4H8z",
};

export function LayoutIcon({
  layout,
  className,
}: {
  layout: LayoutKind;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "size-[18px]"}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[layout]} />
    </svg>
  );
}
