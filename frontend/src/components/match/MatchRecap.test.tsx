import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { MatchRecap } from "./MatchRecap";

// Spec 310: the written recap panel. Made-up clubs and names.
afterEach(() => vi.unstubAllGlobals());
const t = (id: string, category: string, time_s: number, duration_s = 10) => ({ id, category, time_s, duration_s });
const hudl = { id: "m1", title: "261101 U11 v Example Town (H)", moments: [
  t("k", "KICK OFF", 0, 0), t("o1", "OPPOSITION GOAL", 400, 0), t("h", "END HALF", 1500, 0),
  t("g1", "ASTON VILLA GOAL", 1600, 10), t("p1", "Sam Example", 1595, 20), t("g2", "ASTON VILLA GOAL", 2400, 0), t("e", "END", 2990, 10),
] };
const api = { "/api/goals": {}, "/api/scores": {}, "/api/preferences": { primary_player_id: 7 }, "/api/players/7": { id: 7, display_name: "Sam Example" } };

it("writes the recap from the match's facts and copies it", async () => {
  stubFetch(api);
  const writeText = vi.fn(async () => undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  renderWithProviders(<MatchRecap match={hudl} club="Aston Villa" ours="Aston Villa" />);
  const panel = await screen.findByRole("region", { name: "Match recap" });
  expect(panel).toHaveTextContent("Aston Villa won 2-1 at home against Example Town on 1 November 2026.");
  expect(panel).toHaveTextContent("They came from behind to win.");
  expect(panel).toHaveTextContent("It was 0-1 at half-time.");
  expect(panel).toHaveTextContent("Sam Example was tagged in 1 moment, including 1 of the 2 goals we scored.");
  await userEvent.click(within(panel).getByRole("button", { name: /Copy/ }));
  expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^Aston Villa won 2-1 .* goals we scored\.$/));
  expect(await within(panel).findByText("Copied")).toBeInTheDocument();
});

it("uses Veo's venue, periods and counts on a Veo match", async () => {
  stubFetch(api);
  const veo = { id: "veo-1", source: "veo", title: "261101 RC v Northgate", home_or_away: "away", score: { ours: 1, theirs: 0 }, halves: [[0, 1000], [1200, 2200]],
    team_data: { stats: { total_attempts: { own: 7, opponent: 3 }, corners: { own: 2, opponent: 1 } }, events: [{ type: "GOAL", side: "own" as const, time_s: 1500, period: 2 }] } };
  renderWithProviders(<MatchRecap match={veo} club={null} ours="Racing Club" />);
  const panel = await screen.findByRole("region", { name: "Match recap" });
  expect(panel).toHaveTextContent("Racing Club won 1-0 away at Northgate on 1 November 2026.");
  expect(panel).toHaveTextContent("It was 0-0 at half-time.");
  expect(panel).toHaveTextContent("Veo counted 7 attempts to 3 and 2 corners to 1.");
  expect(panel).not.toHaveTextContent("tagged in");
});
