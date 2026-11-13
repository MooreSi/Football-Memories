import { describe, expect, it } from "vitest";
import { resolveClub } from "./clubs";
import { fixtureDate, fixtureParts } from "./hudlFixture";

// Titles copied from the owner's Hudl library (2026-11-13), with the opponent the
// owner sees on the pitch. Several showed initials instead of a crest.
describe("opponent from the owner's real Hudl titles", () => {
  const cases: [string, string][] = [
    ["260329 U10 vs The Hammers - Corey Price", "West Ham United"],
    ["260329 U10 vs Bluebirds - Corey Price", "Cardiff City"],
    ["260329 U10 vs Magpies - Corey Price", "Newcastle United"],
    ["260329 U10 vs Spurs - Corey Price", "Tottenham Hotspur"],
    ["260102 U10 vs Man City (H) (Pitch 2)", "Manchester City"],
    ["251123 U10 vs Chelsea (H) - Pitch 1", "Chelsea"],
    ["260129 U10 vs CFT Slovakia (H)", "CFT Slovakia"],
    ["261101 U10s v Wolves - Pitch 2 - Futsal Festival", "Wolverhampton Wanderers"],
    ["261011 U10 v Man United (H) - Pitch Two", "Manchester United"],
    ["260818 U10 v Shrewsbury Tow (H) - Quad Fixture", "Shrewsbury Town"],
    ["250831 U10 vs QPR (H)", "Queens Park Rangers"],
    ["260412 U10 V Exeter (H)", "Exeter City"],
    ["261029 U12 v Plymouth (H)", "Plymouth Argyle"],
    ["260613 U10 vs Bradford (Quad Fixture)", "Bradford City"],
    ["261103 U19 v Barcelona (A) | UYL", "Barcelona"],
    ["260927 U12 v Bristol City (A) Pitch 1", "Bristol City"],
    ["U12/U13s v Man United (A)", "Manchester United"],
    ["251018 2015s vs Manchester United (Pitch 1)", "Manchester United"],
    ["260401 U10 vs Everton - Final", "Everton"],
    ["261108 U12 v Derby (Truce Cup)", "Derby County"],
  ];
  it.each(cases)("%s -> %s", (title, opponent) => {
    expect(fixtureParts(title, "Aston Villa")?.opponent).toBe(opponent);
  });

  it("takes the other side when our club is written first or second", () => {
    expect(fixtureParts("251029 Arsenal (Gunners) v Aston Villa - Hale End Cup", "Aston Villa")?.opponent).toBe("Arsenal");
    expect(fixtureParts("2026.11.03 Barcelona 3-0 Aston Villa (Tactical)", "Aston Villa")?.opponent).toBe("Barcelona");
    expect(fixtureParts("250216 Aston Villa 1-1 Ipswich Town - First Team", "Aston Villa U10")?.opponent).toBe("Ipswich Town");
  });

  it("keeps the venue and leaves non-fixtures alone", () => {
    expect(fixtureParts("261108 U10s v Stoke City (H) - Pitch Two", "Aston Villa")).toEqual({ opponent: "Stoke City", venue: "Home" });
    expect(fixtureParts("261101 U10/11 Internal Fixture", "Aston Villa")).toBeNull();
    expect(fixtureParts("Doku Combo 2", "Aston Villa")).toBeNull();
    expect(fixtureParts("HUDL Playlist Tutorial", "Aston Villa")).toBeNull();
  });
});

describe("resolveClub", () => {
  it("expands nicknames, short forms and cut-off names to the full club", () => {
    expect(resolveClub("the hammers")).toBe("West Ham United");
    expect(resolveClub("Baggies")).toBe("West Bromwich Albion");
    expect(resolveClub("Leicester City FC U11")).toBe("Leicester City");
    expect(resolveClub("Nottingham For")).toBe("Nottingham Forest");
  });
  it("keeps a club it does not know as written", () => {
    expect(resolveClub("Nick Rizzo Academy")).toBe("Nick Rizzo Academy");
    // Too short to be a safe prefix of anything.
    expect(resolveClub("Man")).toBe("Man");
  });
});

it("reads both date styles in Hudl titles", () => {
  expect(fixtureDate("261108 U10s v Stoke City (H)")?.toDateString()).toBe(new Date(2026, 10, 8).toDateString());
  expect(fixtureDate("2026.11.03 Barcelona 3-0 Aston Villa")?.toDateString()).toBe(new Date(2026, 10, 3).toDateString());
  expect(fixtureDate("261332 U10 v Nobody")).toBeNull();
});
