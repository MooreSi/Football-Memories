import { expect, it } from "vitest";
import { playersFirst } from "./codeOrder";

// Owner request 2026-11-27: in the match rail, "place the players at the top of the list and
// then the other game moments under the players ... in alphabetical order". Made-up names.
it("lists player codes first, then the other codes, each A to Z ignoring case", () => {
  expect(playersFirst(["ASTON VILLA THROW", "Sam Example", "BEST PRACTICE", "Ali Demo", "AVFC GOAL KICK", "best effort", "END HALF", "Zed Test"]))
    .toEqual({ players: ["Ali Demo", "Sam Example", "Zed Test"], moments: ["ASTON VILLA THROW", "AVFC GOAL KICK", "best effort", "BEST PRACTICE", "END HALF"] });
});

it("keeps each code once", () => {
  expect(playersFirst(["Sam Example", "Sam Example", "END HALF"])).toEqual({ players: ["Sam Example"], moments: ["END HALF"] });
});
