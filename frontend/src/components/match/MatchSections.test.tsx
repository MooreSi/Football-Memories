import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { MatchSections } from "./MatchSections";
afterEach(() => vi.unstubAllGlobals());
it("places Player stats after Goals & Keepers, with no score in the title and no Insights tab", async () => {
  stubFetch({ "/api/goals": {} });
  const user = userEvent.setup();
  renderWithProviders(<MatchSections match={{ id: "a", moments: [{ id: "p", category: "Sam Example", time_s: 10, duration_s: 10 }] }}
    club="Aston Villa" rows={[]} flow={{ minutes: [], halves: [] }} ours="Us" theirs="Them" now={0} onSeek={vi.fn()}
    moments={<p>Moments</p>} momentsCount={1} stats={null} goals={<p>Goals</p>} />);
  const tabs = screen.getByRole("tablist", { name: "Match sections" });
  expect(within(tabs).getAllByRole("tab").map(t => t.textContent)).toEqual([
    "Moments · 1", "Goals & Keepers", "Player stats",
  ]);
  await user.click(screen.getByRole("tab", { name: "Goals & Keepers" }));
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("tab", { name: "Player stats" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("region", { name: "Player stats" })).toBeInTheDocument();
});

it("puts Match stats right after Team stats", () => {
  stubFetch({ "/api/goals": {} });
  renderWithProviders(<MatchSections match={{ id: "a", moments: [] }}
    club="Aston Villa" rows={[]} flow={{ minutes: [], halves: [] }} ours="Us" theirs="Them" now={0} onSeek={vi.fn()}
    moments={null} momentsCount={0} stats={<p>Team</p>} matchStats={<p>Match</p>} goals={<p>Goals</p>} />);
  const tabs = within(screen.getByRole("tablist", { name: "Match sections" })).getAllByRole("tab").map(t => t.textContent);
  expect(tabs.slice(0, 2)).toEqual(["Team stats", "Match stats"]);
});

// Owner request 2026-11-27: Insights left the tabs; the record against this opponent
// joins Match stats so it is not lost.
it("shows the head-to-head record in the Match stats tab", () => {
  stubFetch({ "/api/goals": {} });
  renderWithProviders(<MatchSections match={{ id: "a", moments: [] }}
    club="Aston Villa" rows={[]} flow={{ minutes: [], halves: [] }} ours="Us" theirs="Them" now={0} onSeek={vi.fn()}
    moments={null} momentsCount={0} stats={null} matchStats={null} goals={<p>Goals</p>} record={<section aria-label="Head to head">H2H</section>} />);
  const tab = screen.getByRole("tab", { name: "Match stats" });
  expect(document.getElementById(tab.getAttribute("aria-controls")!)).toContainElement(screen.getByRole("region", { name: "Head to head" }));
});
