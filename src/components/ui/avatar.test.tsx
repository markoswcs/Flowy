import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Avatar } from "./avatar";

afterEach(() => {
  cleanup();
});

describe("Avatar", () => {
  it("shows the photo", () => {
    const { container } = render(<Avatar name="Markos Winycius" url="https://example.com/a.webp" />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://example.com/a.webp");
  });

  it("falls back to the initials when the photo cannot load", () => {
    const { container } = render(<Avatar name="Markos Winycius" url="https://example.com/a.webp" />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("MW");
  });

  it("shows the initials without a photo", () => {
    const { container } = render(<Avatar name="Gabriella Leles" url={null} />);
    expect(container.textContent).toBe("GL");
  });
});
