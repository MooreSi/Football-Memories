import { expect, it } from "vitest";
import { THEMES, drawCard, matchCard } from "./reelCards";

it("auto-fills a match card with both clubs, the opponent and the UK date", () => {
  const card = matchCard("261108 U11 v Stoke (A)", "Aston Villa", { age: "U11", moments: 12 });
  expect(card).toMatchObject({ kind: "match", home: "Aston Villa", away: "Stoke City", title: "Aston Villa v Stoke City", date: "8 November 2026" });
  expect(card.detail).toContain("Away");
  expect(card.detail).toContain("12 moments");
});

it("keeps a non-fixture title as written, without a date", () => {
  const card = matchCard("Doku Combo 2", "Aston Villa");
  expect(card.title).toBe("Doku Combo 2");
  expect(card.away).toBeUndefined();
  expect(card.date).toBeUndefined();
});

it("offers at least six themes and draws nothing without a canvas", () => {
  expect(THEMES.length).toBeGreaterThanOrEqual(6);
  expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  expect(drawCard(null, { kind: "opening", title: "x" }, "gold", 0.5)).toBe(false);
});
