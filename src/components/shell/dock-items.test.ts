import { describe, expect, it } from "vitest";

import { placeInDock, resolveDock } from "./dock-items";

const keys = (saved: unknown) => resolveDock(saved).map((item) => item.key);

describe("resolveDock", () => {
  it("shows the default bar until the person chooses", () => {
    expect(keys(undefined)).toEqual(["inicio", "notas", "mapas", "desenhos"]);
  });

  it("shows the chosen shortcuts in their places", () => {
    expect(keys(["inicio", "notas", "treinos", "aulas"])).toEqual(["inicio", "notas", "treinos", "aulas"]);
  });

  it("ignores unknown or repeated keys", () => {
    expect(keys(["inicio", "inicio", "foco", "aulas"])).toEqual(["inicio", "notas", "mapas", "aulas"]);
  });
});

describe("placeInDock", () => {
  it("puts a new shortcut in a place", () => {
    expect(placeInDock(["inicio", "notas", "mapas", "desenhos"], 2, "treinos")).toEqual(["inicio", "notas", "treinos", "desenhos"]);
  });

  it("swaps when the shortcut is already in the bar", () => {
    expect(placeInDock(["inicio", "notas", "mapas", "desenhos"], 0, "desenhos")).toEqual(["desenhos", "notas", "mapas", "inicio"]);
  });
});
