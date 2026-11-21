import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { PlayerStatsPanel } from "./PlayerStatsPanel";
import { EMPTY_ENTRY, matchGoals } from "../../lib/goals";

const t = (id: string, category: string, time_s: number, duration_s = 10) => ({ id, category, time_s, duration_s });
const match = { id: "match-a", moments: [
  t("sam", "SAM EXAMPLE", 20), t("ali", "Ali Demo", 60),
  t("pass", "ASTON VILLA PASS", 22), t("shot", "ASTON VILLA ON TARGET", 62),
] };
const goals = matchGoals(match, "Aston Villa", EMPTY_ENTRY);

it("compares players, distinguishes absent stats, and opens the event behind a count", async () => {
  const user = userEvent.setup(), seek = vi.fn();
  renderWithProviders(<PlayerStatsPanel match={match} club="Aston Villa" goals={goals} onSeek={seek} />);
  expect(screen.getByText(/not verified actions/i)).toBeInTheDocument();
  const sam = screen.getByRole("article", { name: "Sam Example" });
  expect(within(sam).getByLabelText("Chances: not recorded")).toHaveTextContent("—");
  await user.click(within(sam).getByRole("button", { name: "Passes: 1" }));
  await user.click(screen.getByRole("button", { name: /0:22.*Pass/i }));
  expect(seek).toHaveBeenCalledWith(22);
});

it("sorts by a metric and filters names, including no matches", async () => {
  const user = userEvent.setup();
  renderWithProviders(<PlayerStatsPanel match={match} club="Aston Villa" goals={goals} onSeek={vi.fn()} />);
  await user.selectOptions(screen.getByLabelText("Sort players"), "passes");
  expect(screen.getAllByRole("article").map(a => a.getAttribute("aria-label"))).toEqual(["Sam Example", "Ali Demo"]);
  await user.type(screen.getByLabelText("Find player"), "ali");
  expect(screen.getAllByRole("article")).toHaveLength(1);
  await user.clear(screen.getByLabelText("Find player"));
  await user.type(screen.getByLabelText("Find player"), "nobody");
  expect(screen.getByText("No players match your search.")).toBeInTheDocument();
});

it("explains why Veo cannot show individual player totals", () => {
  renderWithProviders(<PlayerStatsPanel match={{ id: "v", source: "veo" }} club={null}
    goals={matchGoals({ source: "veo" }, null)} onSeek={vi.fn()} />);
  expect(screen.getByText(/Veo.*does not provide named player stats/)).toBeInTheDocument();
  expect(screen.queryByRole("article")).toBeNull();
});

it("shows likely goals separately from confirmed attribution and seeks a goal", async () => {
  const user = userEvent.setup(), seek = vi.fn();
  const m = { id: "goals-a", moments: [t("sam", "Sam Example", 110, 15), t("g", "ASTON VILLA GOAL", 100, 25)] };
  renderWithProviders(<PlayerStatsPanel match={m} club="Aston Villa" goals={matchGoals(m, "Aston Villa")} onSeek={seek} />);
  const sam = screen.getByRole("article", { name: "Sam Example" });
  expect(within(sam).getByText("1 likely")).toBeInTheDocument();
  await user.click(within(sam).getByRole("button", { name: "Goals: 1" }));
  await user.click(screen.getByRole("button", { name: /1:40.*Goal · likely/ }));
  expect(seek).toHaveBeenCalledWith(100);
});
it("shows an untimed goal without offering a seek button", async () => {
  const user = userEvent.setup(), seek = vi.fn();
  const entry = { ...EMPTY_ENTRY, added: [{ id: "manual-goal", side: "ours" as const }], scorers: { "manual-goal": "Sam Example" } };
  renderWithProviders(<PlayerStatsPanel match={match} club="Aston Villa" goals={matchGoals(match, "Aston Villa", entry)} onSeek={seek} />);
  await user.click(within(screen.getByRole("article", { name: "Sam Example" })).getByRole("button", { name: "Goals: 1" }));
  expect(screen.getByText("Time not recorded")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Goal · confirmed/ })).toBeNull();
  expect(seek).not.toHaveBeenCalled();
});
it("sorts by offsides and opens the matching tagged clip", async () => {
  const user = userEvent.setup(), seek = vi.fn();
  const m = { ...match, moments: [...match.moments, t("off", "ASTON VILLA OFFSIDE", 22)] };
  renderWithProviders(<PlayerStatsPanel match={m} club="Aston Villa" goals={matchGoals(m, "Aston Villa")} onSeek={seek} />);
  await user.selectOptions(screen.getByLabelText("Sort players"), "offsides");
  expect(screen.getAllByRole("article").map(a => a.getAttribute("aria-label"))).toEqual(["Sam Example", "Ali Demo"]);
  await user.click(within(screen.getByRole("article", { name: "Sam Example" })).getByRole("button", { name: "Offsides: 1" }));
  await user.click(screen.getByRole("button", { name: /0:22.*OFFSIDE/ }));
  expect(seek).toHaveBeenCalledWith(22);
});

it("shows requested stats in groups and identifies direct player-action clips", async () => {
  const user = userEvent.setup(), seek = vi.fn();
  const m = { id: "actions", moments: [{ ...t("sam", "Sam Example", 20), actions: ["passes", "assists", "keyPasses", "interceptions", "blocks", "clearances", "foulsWon", "foulsConceded", "successfulDribbles", "possessionLost"] }] };
  renderWithProviders(<PlayerStatsPanel match={m} club="Aston Villa" goals={matchGoals(m, "Aston Villa")} onSeek={seek} />);
  const sam = screen.getByRole("article", { name: "Sam Example" });
  expect(within(sam).getByRole("button", { name: "Assists: 1" })).toBeInTheDocument();
  expect(within(sam).getByRole("button", { name: "Key passes: 1" })).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Stats shown"), "defending");
  expect(within(sam).getByRole("button", { name: "Interceptions: 1" })).toBeInTheDocument();
  expect(within(sam).queryByRole("button", { name: "Passes: 1" })).toBeNull();
  await user.selectOptions(screen.getByLabelText("Stats shown"), "all");
  await user.click(within(sam).getByRole("button", { name: "Passes: 1" }));
  expect(screen.getByText("Source: Individual action labels on this player’s clips.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /0:20.*individual action/i }));
  expect(seek).toHaveBeenCalledWith(20);
});

it("shows positive actions on a shared count scale and keeps unknown stats in a disclosure", () => {
  const m = { id: "profile", moments: [
    { ...t("s1", "Sam Example", 20), actions: ["passes", "regains"] },
    { ...t("s2", "Sam Example", 40), actions: ["passes"] },
    { ...t("a1", "Ali Demo", 60), actions: ["passes"] },
  ] };
  renderWithProviders(<PlayerStatsPanel match={m} club="Aston Villa" goals={matchGoals(m, "Aston Villa")} onSeek={vi.fn()} />);
  const sam = screen.getByRole("article", { name: "Sam Example" });
  expect(within(sam).getByRole("meter", { name: "Passes" })).toHaveAttribute("aria-valuenow", "2");
  expect(within(sam).getByRole("meter", { name: "Regains" })).toHaveAttribute("aria-valuemax", "2");
  const ali = screen.getByRole("article", { name: "Ali Demo" });
  expect(within(ali).getByRole("meter", { name: "Passes" })).toHaveAttribute("aria-valuemax", "2");
  expect(within(sam).getByRole("button", { name: "Goals: 0" })).toBeInTheDocument();
  expect(within(sam).getByText("Sources and unrecorded stats").closest("details")).not.toHaveAttribute("open");
  expect(within(sam).queryByRole("meter", { name: "Assists" })).toBeNull();
});

it("opens clips when selecting a bar's numeric count", async () => {
  const user = userEvent.setup();
  renderWithProviders(<PlayerStatsPanel match={match} club="Aston Villa" goals={goals} onSeek={vi.fn()} />);
  const sam = screen.getByRole("article", { name: "Sam Example" });
  await user.click(within(sam).getByRole("button", { name: "Review passes clips" }));
  expect(within(sam).getByRole("region", { name: "Player stat clips" })).toBeInTheDocument();
});
