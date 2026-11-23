import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const dismissed = new Set<string>();
vi.mock("@/lib/intro-preferences", () => ({
  useIntroOffered: (key: string) => [!dismissed.has(key), () => dismissed.add(key)] as const,
}));

afterEach(() => cleanup());

describe("FeatureTip", () => {
  it("shows one bubble for a tip used in many places, and 'Entendi' retires all of them", async () => {
    const { FeatureTip } = await import("./feature-tip");
    render(
      <>
        {[1, 2, 3].map((exercise) => (
          <FeatureTip key={exercise} id="treinos-serie" title="Toque no número da série" text="…">
            <button type="button">{exercise}</button>
          </FeatureTip>
        ))}
      </>,
    );
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    act(() => fireEvent.click(screen.getByRole("button", { name: "Entendi" })));
    expect(screen.queryAllByRole("dialog")).toHaveLength(0);
  });
});
