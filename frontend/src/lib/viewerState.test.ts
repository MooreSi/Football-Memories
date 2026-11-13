import { expect, it } from "vitest";
import { unfinished } from "./viewerState";

const w = (match_id: string, position_s: number, duration_s = 0) => ({ match_id, position_s, duration_s, updated_at: 1 });

it("keeps started, unfinished matches that are still in the library", () => {
  const durations = new Map<string, number | undefined>([["a", 5000], ["b", 5000], ["c", 5000], ["e", undefined]]);
  expect(unfinished([w("a", 1200), w("b", 30), w("c", 4900), w("d", 1200), w("e", 900, 5000)], durations).map((x) => x.match_id))
    .toEqual(["a", "e"]);
});
