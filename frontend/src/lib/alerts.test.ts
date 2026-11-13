import { expect, it } from "vitest";
import type { HudlMatch } from "../api/hudl";
import { newAlerts, snapshot } from "./alerts";

const tag = (id: string, category: string) => ({ id, category, time_s: 1, duration_s: 1 });
const match = (id: string, ...codes: string[]): HudlMatch =>
  ({ id, title: `260901 U11 v Club ${id}`, age_group: "U11", capture_key: id, moments: codes.map((c, i) => tag(`${id}${i}`, c)) });

it("records only the player's tagged matches in the snapshot", () => {
  expect(snapshot([match("a", "PAT EXAMPLE", "GOAL"), match("b", "GOAL")], "Pat Example"))
    .toEqual({ matches: ["a", "b"], player: "PAT EXAMPLE", counts: { a: 1 } });
});

it("reports new matches and new moments of the player since the snapshot", () => {
  const seen = snapshot([match("a", "PAT EXAMPLE"), match("b")], "PAT EXAMPLE");
  const now = [match("a", "PAT EXAMPLE", "PAT EXAMPLE", "Pat Example"), match("b", "PAT EXAMPLE"), match("c", "PAT EXAMPLE", "GOAL"), match("d")];
  expect(newAlerts(seen, now, "PAT EXAMPLE")).toEqual([
    { kind: "match", id: "c", title: "260901 U11 v Club c", count: 1 },
    { kind: "match", id: "d", title: "260901 U11 v Club d", count: 0 },
    { kind: "moments", id: "a", title: "260901 U11 v Club a", count: 2 },
    { kind: "moments", id: "b", title: "260901 U11 v Club b", count: 1 },
  ]);
});

it("says nothing when nothing changed, or before a first snapshot", () => {
  const lib = [match("a", "PAT EXAMPLE")];
  expect(newAlerts(snapshot(lib, "PAT EXAMPLE"), lib, "PAT EXAMPLE")).toEqual([]);
  expect(newAlerts(null, lib, "PAT EXAMPLE")).toEqual([]);
});

it("does not count a different player's moments as new after the player changes", () => {
  const seen = snapshot([match("a", "PAT EXAMPLE", "ALEX SAMPLE")], "PAT EXAMPLE");
  expect(newAlerts(seen, [match("a", "PAT EXAMPLE", "ALEX SAMPLE")], "ALEX SAMPLE")).toEqual([]);
});
