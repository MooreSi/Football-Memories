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
