import { redirect } from "next/navigation";

// The Kanban view was removed; old links open the list.
export default function KanbanRedirect() {
  redirect("/app");
}
