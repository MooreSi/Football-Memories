import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalyticsSummary } from "./AnalyticsSummary";
import { MomentRail } from "./MomentRail";
import { Inspector } from "./Inspector";
import { buildMoments } from "./moments";
import type { AnalyticsTag } from "./analyticsTags";
import type { Review } from "./labTypes";

const tag = (type: AnalyticsTag["type"], team: AnalyticsTag["team"], time_s: number, end_s = time_s): AnalyticsTag =>
  ({ id: `analytics-${type}-${team ?? "none"}-${time_s * 100}`, type, team, time_s, end_s, track_id: null, evidence: "from the pitch" });
const TAGS = [
  tag("possession", "own", 0, 30), tag("possession", "opponent", 30, 40),
  tag("pass", "own", 2), tag("pass", "own", 5), tag("pass", "opponent", 32),
  tag("attacking_third_entry", "own", 10), tag("throw", "opponent", 45), tag("ball_out_of_play", null, 40, 45),
];
const review: Review = { revision: 1, source_sha256: "a".repeat(64), events: [], identities: [], reviewed_intervals: [], review_complete: false, track_labels: [], group_labels: [], rejected_suggestions: [] };

describe("AnalyticsSummary", () => {
  it("counts each team's tags from the 2D pitch and its share of possession", () => {
    render(<AnalyticsSummary tags={TAGS} />);
    const table = screen.getByRole("table", { name: "Pitch analytics by team" });
    const row = (label: string) => within(table).getByRole("row", { name: new RegExp(`^${label}`) });
    expect(within(row("Possession %")).getAllByRole("cell").map(c => c.textContent)).toEqual(["75", "25"]);
    expect(within(row("Passes")).getAllByRole("cell").map(c => c.textContent)).toEqual(["2", "1"]);
    expect(within(row("Attacking third entries")).getAllByRole("cell").map(c => c.textContent)).toEqual(["1", "0"]);
    expect(within(row("Throw-ins")).getAllByRole("cell").map(c => c.textContent)).toEqual(["0", "1"]);
    expect(within(table).queryByRole("row", { name: /^Corners/ })).toBeNull();
    expect(screen.getByText(/estimated from tracked positions/i)).toBeInTheDocument();
    expect(screen.getByText(/not Hudl or Veo tags/i)).toBeInTheDocument();
  });
  it("says so when the pitch gives no tags", () => {
    render(<AnalyticsSummary tags={[]} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText(/no pitch analytics tags yet/i)).toBeInTheDocument();
  });
});

describe("analytics tags in the moment list and inspector", () => {
  const moments = buildMoments({ review, teams: new Map(), analytics: TAGS });
  it("are listed under their own source, Pitch analytics", () => {
    render(<MomentRail moments={moments} visible={moments} filter={{ source: null, team: null, type: null }} setFilter={() => undefined} cursor={null} onPlay={() => undefined} />);
    const chip = screen.getByRole("button", { name: /^Pitch analytics/ });
    expect(chip).toHaveTextContent(String(TAGS.length));
    expect(screen.getAllByText("Analytics").length).toBe(TAGS.length);
  });
  it("are shown as estimates with their evidence and cannot be approved", () => {
    const pass = moments.find(m => m.type === "pass")!;
    render(<Inspector jobId="j" review={review} update={() => undefined} state="idle" error="" moment={pass} track={null} teams={new Map()} at={0} />);
    const card = screen.getByRole("region", { name: "Current moment" });
    expect(within(card).getByText(/Pitch analytics tag/)).toBeInTheDocument();
    expect(within(card).getByText(/from the pitch/)).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /Approve/ })).toBeNull();
  });
});
