import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import type { StatEvent } from "../../lib/matchStats";
import type { TeamRow } from "../../lib/veoTeamSplit";
import { MatchStatsPanel } from "./MatchStatsPanel";

const rows: TeamRow[] = [
  { label: "Goals", own: 2, opponent: 4 }, { label: "Attempts", own: 6, opponent: 15 },
  { label: "Corners", own: 3, opponent: 7 }, { label: "Fouls", own: 12, opponent: 9 },
];
const events: StatEvent[] = [
  { side: "ours", kind: "attempt", time_s: 300 }, { side: "ours", kind: "goal", time_s: 1250 },
  { side: "theirs", kind: "attempt", time_s: 600 }, { side: "theirs", kind: "goal", time_s: 2000 },
];
const base = { rows, events, halves: [[0, 1500], [1600, 3000]], duration: 3000, ours: "Racing", theirs: "Opponent", source: "Veo" };

it("draws the head-to-head bars, the conversion rings and what stood out", () => {
  render(<MatchStatsPanel {...base} previous={[]} onSeek={vi.fn()} />);
  const panel = screen.getByRole("region", { name: "Match stats" });
  const key = within(panel).getByRole("group", { name: "Key match stats" });
  expect(within(key).getByLabelText("Goals: Racing 2, Opponent 4")).toBeInTheDocument();
  expect(within(key).getByLabelText("Fouls: Racing 12, Opponent 9")).toBeInTheDocument();
  expect(within(panel).getByRole("img", { name: "Racing conversion rate 33%" })).toBeInTheDocument();
  expect(within(panel).getByRole("img", { name: "Opponent conversion rate 27%" })).toBeInTheDocument();
  const stood = within(panel).getByRole("list", { name: "What stood out" });
  expect(within(stood).getAllByRole("listitem")[0]).toHaveTextContent("Finishing: 6 attempts produced 2 goals, a 33% conversion rate (opponent 27%).");
  // No earlier matches: the tiles say so rather than inventing a trend.
  expect(within(panel).queryByText(/vs last/)).not.toBeInTheDocument();
});

it("compares the headline numbers with the earlier matches", () => {
  render(<MatchStatsPanel {...base} previous={[[{ label: "Goals", own: 1, opponent: 0 }], [{ label: "Goals", own: 1, opponent: 2 }]]} onSeek={vi.fn()} />);
  const tile = screen.getByRole("figure", { name: "Goals headline" });
  expect(tile).toHaveTextContent("vs last 2 avg");
  expect(tile).toHaveTextContent("+100%");
});

it("seeks to a goal from the attempts chart", async () => {
  const onSeek = vi.fn();
  render(<MatchStatsPanel {...base} previous={[]} onSeek={onSeek} />);
  await userEvent.click(screen.getByRole("button", { name: "Racing goal at 20:50" }));
  expect(onSeek).toHaveBeenCalledWith(1250);
});

it("shows nothing when the match has no sided numbers", () => {
  const { container } = render(<MatchStatsPanel {...base} rows={[]} events={[]} previous={[]} onSeek={vi.fn()} />);
  expect(container).toBeEmptyDOMElement();
});
