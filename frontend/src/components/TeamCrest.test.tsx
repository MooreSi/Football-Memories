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

describe("Team crest framing (owner request 2026-11-11)", () => {
  it("puts every real crest on the same plain disc with the same inset, whichever side it is on", () => {
    const { container } = render(<><TeamBadge name="Aston Villa" tone="home" /><TeamBadge name="Liverpool" tone="away" /></>);
    const discs = [...container.querySelectorAll("[data-crest]")];
    expect(discs).toHaveLength(2);
    expect(discs[0].className).toBe(discs[1].className);
    const images = [...container.querySelectorAll("img")];
    expect(images[0].className).toBe(images[1].className);
    expect(images[0].className).toMatch(/object-contain/);
  });
});
