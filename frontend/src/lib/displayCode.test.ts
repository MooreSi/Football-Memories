import { expect, it } from "vitest";
import { displayCode, displayLibrary } from "./hudlPlayer";

it("shows player names the way people write them (owner decision 005)", () => {
  expect(displayCode("CHRIS DEMO")).toBe("Chris Demo");
  expect(displayCode("JO HART-SMITH")).toBe("Jo Hart-Smith");
  expect(displayCode("SAM O'DEMO")).toBe("Sam O'Demo");
  expect(displayCode("Chris Demo")).toBe("Chris Demo");
});

it("leaves situation codes and anything not a plain name as they are", () => {
  expect(displayCode("ASTON VILLA POSSESSION")).toBe("ASTON VILLA POSSESSION");
  expect(displayCode("DEF IN FINAL 3RD")).toBe("DEF IN FINAL 3RD");
  expect(displayCode("THEO (T)")).toBe("THEO (T)");
  expect(displayCode("QCC")).toBe("QCC");
  // Seen in real tag sets: plain words that are not names.
  expect(displayCode("END HALF")).toBe("END HALF");
  expect(displayCode("BEST PRACTICE")).toBe("BEST PRACTICE");
  expect(displayCode("RIVERSIDE INJURY")).toBe("RIVERSIDE INJURY");
});

it("rewrites every moment's code in a served library and nothing else", () => {
  const lib = [{ id: "a", title: "U11 v X", age_group: "U11", capture_key: "a", moments: [
    { id: "1", category: "CHRIS DEMO", time_s: 1, duration_s: 2 }, { id: "2", category: "ASTON VILLA GOAL", time_s: 3, duration_s: 0 }] }];
  expect(displayLibrary(lib)[0].moments!.map((m) => [m.id, m.category, m.time_s])).toEqual([["1", "Chris Demo", 1], ["2", "ASTON VILLA GOAL", 3]]);
  expect(lib[0].moments[0].category).toBe("CHRIS DEMO");
});
