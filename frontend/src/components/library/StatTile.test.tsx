import { render, screen } from "@testing-library/react";
import { Film, Sparkles } from "lucide-react";
import { expect, it } from "vitest";
import { StatTile } from "./StatTile";

it("keeps big numbers inside the tile: separators, unit on its own line, one number size", () => {
  render(<><StatTile label="Moments" icon={Sparkles} value="29687" unit="tagged" /><StatTile label="Matches" icon={Film} value="25" unit="matches" hint="1 team" /></>);
  const moments = screen.getByRole("group", { name: "Moments" });
  const matches = screen.getByRole("group", { name: "Matches" });
  const number = (tile: HTMLElement) => tile.querySelector("[data-stat-value]")!;
  expect(number(moments)).toHaveTextContent(/^29,687$/);
  expect(number(matches).className).toBe(number(moments).className);
  expect(number(moments).className).toMatch(/whitespace-nowrap/);
  expect(screen.getByText("tagged").closest("[data-stat-value]")).toBeNull();
});

it("leaves non-numeric values such as hours and dashes as written", () => {
  render(<><StatTile label="Footage" icon={Film} value="2.5" unit="hours" /><StatTile label="Players" icon={Film} value="-" /></>);
  expect(screen.getByRole("group", { name: "Footage" }).querySelector("[data-stat-value]")).toHaveTextContent(/^2.5$/);
  expect(screen.getByRole("group", { name: "Players" }).querySelector("[data-stat-value]")).toHaveTextContent(/^-$/);
});
