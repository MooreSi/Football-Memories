import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EventPanel } from "./EventPanel";
import type { MatchEvent } from "../api/types";

const events: MatchEvent[] = [
  { id: 1, time_s: 10, duration_s: 0, category: "Save", players: ["Sam"], note: "low dive" },
  { id: 2, time_s: 70, duration_s: 0, category: "Goal", players: ["Alex"], note: "" },
  { id: 3, time_s: 130, duration_s: 0, category: "Save", players: ["Alex", "Sam"], note: "" },
];

function setup() {
  const onSelect = vi.fn();
  const onFilterChange = vi.fn();
  render(<EventPanel events={events} onSelect={onSelect} onFilterChange={onFilterChange} activeEventId={null} />);
  const list = screen.getByRole("list", { name: "Tagged moments" });
  return { onSelect, onFilterChange, list };
}

describe("EventPanel", () => {
  it("lists every moment with its time and category", () => {
    const { list } = setup();
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getByText("1:10")).toBeInTheDocument();
  });

  it("filters by category when a category chip is pressed", async () => {
    const { list, onFilterChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Goal \(1\)/ }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(onFilterChange).toHaveBeenLastCalledWith([events[1]]);
  });

  it("switching to AND requires every selected player on the moment", async () => {
    const { list } = setup();
    await userEvent.click(screen.getByRole("button", { name: /^Sam/ }));
    await userEvent.click(screen.getByRole("button", { name: /^Alex/ }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    await userEvent.click(screen.getByRole("radio", { name: "Match all" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
  });

  it("selecting a moment reports it", async () => {
    const { list, onSelect } = setup();
    await userEvent.click(within(list).getByText("low dive"));
    expect(onSelect).toHaveBeenCalledWith(events[0]);
  });
});
