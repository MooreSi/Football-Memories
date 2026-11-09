import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerAvatar } from "./PlayerAvatar";

describe("PlayerAvatar", () => {
  it("shows the photo when there is one", () => {
    render(<PlayerAvatar name="Sam Example" photoUrl="/api/players/1/photo?v=abc" />);
    expect(screen.getByRole("img", { name: "Photo of Sam Example" })).toHaveAttribute("src", "/api/players/1/photo?v=abc");
  });

  it("falls back to initials without a photo", () => {
    const { container } = render(<PlayerAvatar name="Sam Example" photoUrl={null} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.textContent).toBe("SE");
  });
});
