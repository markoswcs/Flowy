import { redirect } from "next/navigation";

// Focus mode was removed; old links and home-screen shortcuts open Início.
export default function FocusRedirect() {
  redirect("/app");
}
