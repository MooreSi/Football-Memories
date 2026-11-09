import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { MatchDetail, MatchEvent } from "../../api/types";
import { useMomentFilter } from "../../lib/useMomentFilter";
import { MomentList } from "./MomentList";
import { MomentsRail } from "./MomentsRail";

const events: MatchEvent[] = [
  { id: 1, time_s: 10, duration_s: 0, category: "Save", players: ["Sam"], note: "low dive" },
  { id: 2, time_s: 70, duration_s: 0, category: "Goal", players: ["Alex"], note: "" },
  { id: 3, time_s: 130, duration_s: 0, category: "Save", players: ["Alex", "Sam"], note: "" },
];

const match: MatchDetail = {
  id: 7, team_id: 1, team_name: "Riverside U12", season_id: 1, season_label: "2026/27", age_group: "U12",
  opponent: "Rovers", match_date: "2026-10-18", competition: "League", event_count: 3, media_id: 3,
  duration_s: 3600, thumbnail_url: null, offline: true, media: null, events,
};

function Harness({ onSelect }: { onSelect: (e: MatchEvent) => void }) {
  const f = useMomentFilter(events);
  return (
    <MemoryRouter>
      <MomentsRail match={match} filter={f} />
      <MomentList events={f.filtered} activeEventId={null} onSelect={onSelect} />
    </MemoryRouter>
  );
}

function setup() {
  const onSelect = vi.fn();
  render(<Harness onSelect={onSelect} />);
  return { onSelect, list: () => screen.getByRole("list", { name: "Tagged moments" }) };
}

describe("Moments rail + list", () => {
  it("lists every moment with its time and category, with All moments active", () => {
    const { list } = setup();
    expect(within(list()).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list()).getByText("1:10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All moments/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows each event type with its count, most frequent first", () => {
    setup();
    const types = within(screen.getByRole("list", { name: "Event types" })).getAllByRole("button");
    expect(types.map((b) => b.textContent)).toEqual(["All moments3", "Save2", "Goal1"]);
  });

  it("pressing an event type filters the moments and highlights the row", async () => {
    const { list } = setup();
    const goal = screen.getByRole("button", { name: /^Goal/ });
    await userEvent.click(goal);
    expect(goal).toHaveAttribute("aria-pressed", "true");
    expect(within(list()).getAllByRole("listitem")).toHaveLength(1);
  });

  it("All moments clears the filters", async () => {
    const { list } = setup();
    await userEvent.click(screen.getByRole("button", { name: /^Goal/ }));
    await userEvent.click(screen.getByRole("button", { name: /All moments/ }));
    expect(within(list()).getAllByRole("listitem")).toHaveLength(3);
  });

  it("switching to Match all requires every selected player on the moment", async () => {
    const { list } = setup();
    await userEvent.click(screen.getByRole("button", { name: /^Sam/ }));
    await userEvent.click(screen.getByRole("button", { name: /^Alex/ }));
    expect(within(list()).getAllByRole("listitem")).toHaveLength(3);
    await userEvent.click(screen.getByRole("radio", { name: "Match all" }));
    expect(within(list()).getAllByRole("listitem")).toHaveLength(1);
  });

  it("selecting a moment reports it", async () => {
    const { list, onSelect } = setup();
    await userEvent.click(within(list()).getByText("low dive"));
    expect(onSelect).toHaveBeenCalledWith(events[0]);
  });
});
