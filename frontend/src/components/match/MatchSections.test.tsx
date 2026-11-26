import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { MatchSections } from "./MatchSections";
afterEach(() => vi.unstubAllGlobals());
it("places Player stats after Goals and keepers and reaches it with the keyboard", async () => {
  stubFetch({ "/api/goals": {} });
  const user = userEvent.setup();
  renderWithProviders(<MatchSections match={{ id: "a", moments: [{ id: "p", category: "Sam Example", time_s: 10, duration_s: 10 }] }}
    club="Aston Villa" rows={[]} flow={{ minutes: [], halves: [] }} ours="Us" theirs="Them" now={0} onSeek={vi.fn()}
    moments={<p>Moments</p>} momentsCount={1} stats={null} goals={<p>Goals</p>} insights={<p>Insights</p>} />);
  const tabs = screen.getByRole("tablist", { name: "Match sections" });
  expect(within(tabs).getAllByRole("tab").map(t => t.textContent)).toEqual([
    "Moments · 1", "Goals and keepers · 0–0", "Player stats", "Insights",
  ]);
  await user.click(screen.getByRole("tab", { name: /^Goals and keepers/ }));
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("tab", { name: "Player stats" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("region", { name: "Player stats" })).toBeInTheDocument();
});

it("puts Match stats right after Team stats", () => {
  stubFetch({ "/api/goals": {} });
  renderWithProviders(<MatchSections match={{ id: "a", moments: [] }}
    club="Aston Villa" rows={[]} flow={{ minutes: [], halves: [] }} ours="Us" theirs="Them" now={0} onSeek={vi.fn()}
    moments={null} momentsCount={0} stats={<p>Team</p>} matchStats={<p>Match</p>} goals={<p>Goals</p>} insights={null} />);
  const tabs = within(screen.getByRole("tablist", { name: "Match sections" })).getAllByRole("tab").map(t => t.textContent);
  expect(tabs.slice(0, 2)).toEqual(["Team stats", "Match stats"]);
});
