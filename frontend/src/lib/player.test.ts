import { describe, expect, it } from "vitest";
import type { PlayerMoment } from "../api/types";
import { abbreviate, groupTimeline, radarPoints, trend } from "./player";

const mo = (event_id: number, match_id: number, match_date: string, time_s: number, season_label = "2026/27"): PlayerMoment => ({
  event_id, match_id, time_s, duration_s: 0, category: "Save", players: ["Sam"], note: "", favourite: false,
  viewed: false, team_name: "Riverside", opponent: `Opp${match_id}`, match_date, season_label, age_group: "U12",
  media_id: match_id, stream_url: null, thumbnail_url: null, match_duration_s: 3600,
});

describe("groupTimeline", () => {
  it("groups season > month > match > moment, newest first, moments in match order", () => {
    const out = groupTimeline([
      mo(1, 10, "2026-10-18", 50),
      mo(2, 11, "2026-11-01", 5),
      mo(3, 10, "2026-10-18", 10),
      mo(4, 12, "2027-09-05", 1, "2027/28"),
      mo(5, 13, "2026-10-25", 2),
    ]);
    expect(out.map((s) => s.season)).toEqual(["2027/28", "2026/27"]);
    expect(out[1].months.map((m) => m.key)).toEqual(["2026-11", "2026-10"]);
    expect(out[1].months[1].matches.map((m) => m.match_id)).toEqual([13, 10]);
    expect(out[1].months[1].matches[1].moments.map((m) => m.event_id)).toEqual([3, 1]);
  });

  it("returns nothing for no moments", () => expect(groupTimeline([])).toEqual([]));
});

describe("radarPoints", () => {
  it("starts at the top and goes clockwise, scaled to the max value", () => {
    const pts = radarPoints([4, 2, 4, 0], 4, 10, 0, 0).map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
    expect(pts).toEqual([[0, -10], [5, 0], [0, 10], [0, 0]]);
  });
});

describe("abbreviate", () => {
  it("uses the first three letters of a single word", () => expect(abbreviate("Interception")).toBe("INT"));
  it("keeps a short first word and adds initials", () => expect(abbreviate("GK Distribution")).toBe("GKD"));
  it("uses initials for longer phrases", () => expect(abbreviate("one on one")).toBe("OOO"));
});

describe("trend", () => {
  it("compares the latest match with the average of the ones before it", () => {
    expect(trend([2, 2, 4])).toBe("up");
    expect(trend([4, 4, 1])).toBe("down");
    expect(trend([3, 3])).toBe("flat");
    expect(trend([5])).toBe("flat");
  });
});
