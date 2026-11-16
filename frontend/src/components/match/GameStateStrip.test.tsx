import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { GameStateStrip } from "./GameStateStrip";

// Spec 290: how the score went on one match. Made-up clubs.
afterEach(() => vi.unstubAllGlobals());
const t = (id: string, category: string, time_s: number, duration_s = 10) => ({ id, category, time_s, duration_s });
// Tags run 0-3000; behind at 600, level at 1500, ahead at 2400.
const comeback = { id: "m1", title: "261101 U11 v Example Town", moments: [
  t("s", "KICK OFF", 0, 0), t("g1", "OPPOSITION GOAL", 600, 0), t("g2", "ASTON VILLA GOAL", 1500, 0), t("g3", "ASTON VILLA GOAL", 2400, 0), t("e", "END", 2990, 10),
] };

it("draws how the score went, with shares, the story and goals to watch", async () => {
  stubFetch({ "/api/goals": {}, "/api/scores": {} });
  const seek = vi.fn();
  renderWithProviders(<GameStateStrip match={comeback} club="Aston Villa" onSeek={seek} />);
  const panel = await screen.findByRole("region", { name: "How the score went" });
  expect(within(panel).getByText(/Came from behind to win/)).toBeInTheDocument();
  expect(within(panel).getByText(/Ahead 20% · Level 50% · Behind 30%/)).toBeInTheDocument();
  expect(within(panel).getAllByTestId("game-segment").map((s) => s.dataset.state)).toEqual(["level", "behind", "level", "ahead"]);
  await userEvent.click(within(panel).getByRole("button", { name: /2-1 at 40:00/ }));
  expect(seek).toHaveBeenCalledWith(2400);
});

it("says why when the goals do not add up to the score, and draws nothing", async () => {
  stubFetch({ "/api/goals": {}, "/api/scores": { m1: { ours: 3, theirs: 1 } } });
  renderWithProviders(<GameStateStrip match={comeback} club="Aston Villa" />);
  const panel = await screen.findByRole("region", { name: "How the score went" });
  expect(within(panel).getByText(/do not add up to the score \(3-1\)/)).toBeInTheDocument();
  expect(within(panel).queryAllByTestId("game-segment")).toEqual([]);
});

it("uses Veo's goal events, score and periods", async () => {
  stubFetch({ "/api/goals": {}, "/api/scores": {} });
  const veo = { id: "veo-1", source: "veo", title: "261101 RC v Northgate", score: { ours: 1, theirs: 1 }, halves: [[0, 1000], [1200, 2200]],
    team_data: { stats: {}, events: [{ type: "GOAL", side: "own" as const, time_s: 500, period: 1 }, { type: "GOAL", side: "opponent" as const, time_s: 2000, period: 2 }] } };
  renderWithProviders(<GameStateStrip match={veo} club={null} />);
  const panel = await screen.findByRole("region", { name: "How the score went" });
  expect(within(panel).getByText(/Led, then drawn/)).toBeInTheDocument();
  // Level 500 + 200, ahead 500 + 800 of the 2000 played.
  expect(within(panel).getByText(/Ahead 65% · Level 35% · Behind 0%/)).toBeInTheDocument();
});
