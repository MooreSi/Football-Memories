import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MatchEvent } from "../../api/types";
import { MomentTimeline } from "./MomentTimeline";

const events: MatchEvent[] = [
  { id: 1, time_s: 900, duration_s: 0, category: "Save", players: [], note: "" },
  { id: 2, time_s: 2700, duration_s: 0, category: "Goal", players: [], note: "" },
];

describe("MomentTimeline", () => {
  it("places a pin per moment at its share of the match", () => {
    render(<MomentTimeline events={events} duration={3600} time={0} activeEventId={null} onPin={vi.fn()} onSeek={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Save at 15:00" })).toHaveStyle({ left: "25%" });
    expect(screen.getByRole("button", { name: "Goal at 45:00" })).toHaveStyle({ left: "75%" });
  });

  it("pressing a pin asks to play that moment and does not also seek", async () => {
    const onPin = vi.fn();
    const onSeek = vi.fn();
    render(<MomentTimeline events={events} duration={3600} time={0} activeEventId={null} onPin={onPin} onSeek={onSeek} />);
    await userEvent.click(screen.getByRole("button", { name: "Goal at 45:00" }));
    expect(onPin).toHaveBeenCalledWith(events[1]);
    expect(onSeek).not.toHaveBeenCalled();
  });

  it("marks the playing moment", () => {
    render(<MomentTimeline events={events} duration={3600} time={0} activeEventId={2} onPin={vi.fn()} onSeek={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Goal at 45:00" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Save at 15:00" })).toHaveAttribute("aria-current", "false");
  });
});
