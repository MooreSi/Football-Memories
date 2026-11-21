import { screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { HudlMatch } from "../../api/hudl";
import { EMPTY_ENTRY } from "../../lib/goals";
import { renderWithProviders, stubFetch } from "../../test/render";
import { MilestonesTimeline } from "./MilestonesTimeline";
const library: HudlMatch[] = [{ id: "a", title: "260901 U11 v Rovers", age_group: "U11", capture_key: "a", moments: [{ id: "p", category: "Sam Example", time_s: 10, duration_s: 10, actions: ["passes", "penaltiesScored"] }] }];
afterEach(() => vi.unstubAllGlobals());
it("shows goalkeeper career stats and save targets instead of moment badges", async () => {
  stubFetch({ "/api/goals": { a: { ...EMPTY_ENTRY, keepers: [{ name: "Sam Example", saves: 3 }] } }, "/api/scores": {} });
  renderWithProviders(<MilestonesTimeline library={library} name="Sam Example" position="GK" club={null} />);
  const panel = await screen.findByRole("region", { name: "Milestones" });
  const saves = await within(panel).findByRole("group", { name: "Goals saved" });
  expect(saves).toHaveTextContent("3");
  expect(saves).toHaveTextContent("Next: 5 · 2 to go");
  expect(within(panel).getByRole("group", { name: "Goals conceded" }).querySelector('[role="progressbar"]')).toBeNull();
  expect(within(panel).queryByText(/moments|First team goal/i)).toBeNull();
  expect(within(panel).queryByRole("group", { name: "Goals scored" })).toBeNull();
});
it("selects outfield goals and penalty milestones", async () => {
  stubFetch({ "/api/goals": {}, "/api/scores": {} });
  renderWithProviders(<MilestonesTimeline library={library} name="Sam Example" position="Forward" club={null} />);
  expect(await screen.findByRole("group", { name: "Penalties scored" })).toHaveTextContent("1");
  expect(screen.queryByRole("group", { name: "Goals saved" })).toBeNull();
});
it("is left out with no matches", () => {
  stubFetch({ "/api/goals": {}, "/api/scores": {} });
  renderWithProviders(<MilestonesTimeline library={[]} name="Sam" position="GK" club={null} />);
  expect(screen.queryByRole("region", { name: "Milestones" })).toBeNull();
});
