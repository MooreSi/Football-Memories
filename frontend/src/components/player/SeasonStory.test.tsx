import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { HudlMatch } from "../../api/hudl";
import { EMPTY_ENTRY } from "../../lib/goals";
import { renderWithProviders, stubFetch } from "../../test/render";
import { SeasonStory } from "./SeasonStory";
const library: HudlMatch[] = [
  { id: "old", title: "250901 U10 v Town", age_group: "U10", capture_key: "old", moments: [{ id: "p", category: "Sam Example", time_s: 10, duration_s: 10, actions: ["passes"] }] },
  { id: "keeper", title: "260901 U11 v Rovers", age_group: "U11", capture_key: "keeper", moments: [{ id: "k", category: "Sam Example", time_s: 10, duration_s: 10 }] },
  { id: "out", title: "260908 U11 v City", age_group: "U11", capture_key: "out", moments: [{ id: "o", category: "Sam Example", time_s: 10, duration_s: 10, actions: ["passes", "crosses", "regains", "defensive1v1", "attacking1v1", "fouls"] }] },
];
const props = { library, series: [], name: "Sam Example", position: "Goalkeeper", club: "Aston Villa", today: new Date("2026-11-21T12:00:00Z") };
afterEach(() => vi.unstubAllGlobals());

it("shows only the selected goalkeeper role across seasons", async () => {
  stubFetch({ "/api/goals": { keeper: { ...EMPTY_ENTRY, keepers: [{ name: "Sam Example", saves: 3 }], added: [{ id: "g", side: "theirs" }] } } });
  renderWithProviders(<SeasonStory {...props} />);
  const panel = await screen.findByRole("region", { name: "Season story" });
  const keeper = await within(panel).findByRole("region", { name: "Goalkeeping season stats" });
  expect(within(keeper).getByRole("meter", { name: "Save percentage" })).toHaveAttribute("aria-valuenow", "75");
  expect(within(keeper).getByRole("group", { name: "Goals saved" })).toHaveTextContent("3");
  expect(within(panel).queryByRole("region", { name: "Outfield season stats" })).toBeNull();
  expect(within(panel).queryByRole("list", { name: "Match of the month" })).toBeNull();
  expect(within(panel).getByRole("tabpanel")).toHaveTextContent("3 saves");
  await userEvent.setup().click(within(panel).getByRole("tab", { name: "2025/26" }));
  expect(within(panel).getByRole("region", { name: "Goalkeeping season stats" })).toBeInTheDocument();
  expect(within(panel).queryByRole("region", { name: "Outfield season stats" })).toBeNull();
  expect(within(panel).getByRole("tabpanel")).toHaveTextContent("No goalkeeping stats recorded");
  expect(within(panel).getByRole("tab", { name: "2025/26" })).toHaveAttribute("aria-selected", "true");
});

it("displays unrecorded stats without drawing a fabricated performance bar", async () => {
  stubFetch({ "/api/goals": {} });
  renderWithProviders(<SeasonStory {...props} library={[library[0]]} position="Forward" />);
  const panel = await screen.findByRole("region", { name: "Outfield season stats" });
  expect(within(panel).getByRole("group", { name: "Attacking 1v1s" })).toHaveTextContent("—");
  expect(within(panel).queryByRole("meter", { name: "Attacking 1v1s" })).toBeNull();
  expect(within(panel).getByText(/recorded encounters, not wins/i)).toBeInTheDocument();
});

it("shows a saved-data failure instead of uncorrected season totals", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
  renderWithProviders(<SeasonStory {...props} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load saved goals and keepers");
  expect(screen.queryByRole("meter")).toBeNull();
});

it("is left out with no matches", () => {
  stubFetch({ "/api/goals": {} });
  renderWithProviders(<SeasonStory {...props} library={[]} />);
  expect(screen.queryByRole("region", { name: "Season story" })).toBeNull();
});
