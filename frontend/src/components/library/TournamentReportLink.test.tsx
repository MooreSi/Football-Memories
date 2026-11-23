import { fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { TournamentProvider } from "./Tournaments";
import { GroupedTournaments } from "./GroupedTournaments";

afterEach(() => vi.unstubAllGlobals());
it("places full-event and preselected squad reports in the expanded tournament", async () => {
  stubFetch({ "/api/tournaments": [{ id: "cup", name: "Cup", entries: { "hudl:one": "Riverside Blue" } }] });
  renderWithProviders(<TournamentProvider compact><GroupedTournaments games={[{ key: "hudl:one", title: "Match", date: "2026-10-26", href: "/hudl/one", score: () => null, source: "Hudl" }]} eligibleKeys={["hudl:one"]} scores={[]} /></TournamentProvider>);
  expect(await screen.findByRole("link", { name: "Tournament report" })).toHaveAttribute("href", "/report/tournament/cup");
  fireEvent.click(screen.getByRole("button", { name: "Open squad Riverside Blue" }));
  expect(screen.getByRole("link", { name: "Squad report" })).toHaveAttribute("href", "/report/tournament/cup?team=Riverside%20Blue");
});
