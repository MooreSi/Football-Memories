import { describe, expect, it } from "vitest";
import { matchTitle, relatedRuns } from "./relatedRuns";

const run = (id: string, match_title?: string, sample_id = id) => ({ id, match_title, sample_id, state: "complete" });

describe("matchTitle", () => {
  it("is the run's own title", () => {
    expect(matchTitle(run("a", "261122 NL vs Bournville Greens"), [])).toBe("261122 NL vs Bournville Greens");
  });
  it("comes from the run it was derived from when a derived run has none (a shirt-number run)", () => {
    expect(matchTitle(run("child", undefined, "veo-1"), [run("parent", "261122 NL vs Bournville Greens", "veo-1")])).toBe("261122 NL vs Bournville Greens");
  });
});

describe("relatedRuns", () => {
  it("puts earlier runs of the same match before the most recent runs of other matches", () => {
    const others = [...Array.from({ length: 8 }, (_, i) => run(`other${i}`, "261109 RCW vs SBITC Eagles")), run("same", "261122 NL vs Bournville Greens")];
    expect(relatedRuns("261122 NL vs Bournville Greens", others).map(r => r.id)[0]).toBe("same");
    expect(relatedRuns("261122 NL vs Bournville Greens", others)).toHaveLength(6);
  });
  it("gives a derived run of the same match its title so its labels are remembered", () => {
    const others = [run("parent", "261122 NL vs Bournville Greens", "veo-1"), run("child", undefined, "veo-1")];
    expect(relatedRuns("261122 NL vs Bournville Greens", others)).toEqual([
      { id: "parent", match_title: "261122 NL vs Bournville Greens" }, { id: "child", match_title: "261122 NL vs Bournville Greens" }]);
  });
});
