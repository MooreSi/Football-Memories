import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { FixtureCrests } from "./FixtureCrests";

// Owner request 2026-11-11: a long name ("Leeds United" on two lines) pushed its crest
// up. Crests now share one row and names sit in the row below, so both crests always
// have the same size, height and position.
it("puts both crests in the same row, at the same size, with the names below", () => {
  const { container } = render(<FixtureCrests home="Aston Villa" away="Leeds United Football Club Academy" middle={<span>vs</span>} />);
  const slots = [...container.querySelectorAll("[data-crest-slot]")];
  expect(slots).toHaveLength(2);
  expect(slots.every((s) => s.className.includes("row-start-1"))).toBe(true);
  const discs = [...container.querySelectorAll("[data-crest]")];
  expect(discs[0].className).toBe(discs[1].className.replace(/from-\[#e8eef8\] to-\[#93a1bd\]/, "from-accent/90 to-[#3b82f6]"));
  for (const name of ["Aston Villa", "Leeds United Football Club Academy"]) {
    expect(screen.getByText(name).className).toMatch(/row-start-2/);
  }
  expect(screen.getByText("vs").parentElement!.className).toMatch(/row-start-1/);
});
