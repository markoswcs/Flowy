import type { Metadata } from "next";

import { FocusPage } from "@/features/focus/focus-page";

export const metadata: Metadata = { title: "Foco" };

export default function FocusRoute() {
  return <FocusPage />;
}
