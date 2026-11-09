import type { Metadata } from "next";

import { WorkoutsPage } from "@/features/workouts/workouts-page";

export const metadata: Metadata = { title: "Treinos" };

export default function WorkoutsRoute() {
  return <WorkoutsPage />;
}
