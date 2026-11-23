import { describe, expect, it } from "vitest";
import { tournamentStats } from "./tournaments";

describe("tournamentStats", () => {
  it("keeps entered teams separate and excludes missing scores from results", () => {
    const stats = tournamentStats({ id: "cup", name: "Cup", entries: {
      "hudl:one": "Blue", "veo:one": "White", "local:1": "Blue", "hudl:two": "Blue", "veo:missing": "White",
    } }, [
      { key: "hudl:one", score: { ours: 4, theirs: 1 } },
      { key: "veo:one", score: { ours: 0, theirs: 2 } },
      { key: "local:1", score: { ours: 0, theirs: 0 } },
      { key: "hudl:two", score: null },
    ]);
    expect(stats).toEqual([
      { team: "Blue", games: 3, scored: 2, won: 1, drawn: 1, lost: 0, gf: 4, ga: 1, gd: 3 },
      { team: "White", games: 2, scored: 1, won: 0, drawn: 0, lost: 1, gf: 0, ga: 2, gd: -2 },
    ]);
  });
  it("does not count unrelated games or duplicate catalog rows", () => {
    expect(tournamentStats({ id: "cup", name: "Cup", entries: {"hudl:one": "Blue"} }, [
      { key: "hudl:one", score: { ours: 2, theirs: 1 } },
      { key: "hudl:one", score: { ours: 2, theirs: 1 } },
      { key: "veo:one", score: { ours: 10, theirs: 0 } },
    ])[0]).toEqual({ team: "Blue", games: 1, scored: 1, won: 1, drawn: 0, lost: 0, gf: 2, ga: 1, gd: 1 });
  });
});
