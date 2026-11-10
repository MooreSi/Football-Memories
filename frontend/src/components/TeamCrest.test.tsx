import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeamBadge } from "./TeamBadge";

describe("Team crest", () => {
  it("requests a cached team crest and falls back to initials on lookup failure", () => {
    const { container } = render(<TeamBadge name="Aston Villa U10" />);
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "/api/team-logo?name=Aston%20Villa%20U10");
    fireEvent.error(image!);
    expect(screen.getByText("AV")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});
