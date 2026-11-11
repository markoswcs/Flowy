import type { Metadata } from "next";

import { ClassesPage } from "@/features/classes/classes-page";

export const metadata: Metadata = { title: "Grade de aulas" };

export default function ClassesRoute() {
  return <ClassesPage />;
}
