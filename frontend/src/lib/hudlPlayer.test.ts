import { expect, it } from "vitest";
import { displayCode, looksLikePlayer } from "./hudlPlayer";

it.each([
  "Period Start", "PERIOD END", "  Period   Start  ",
  "ANALYST CLIP", "ANALYST CLIPS", "ANALYSTS FOCUS", "COACH CLIP",
  "PHYSICAL FOCUS", "YELLOW SET PIECE", "BIB SET PIECE",
  "Technical Focus", "Tactical Focus", "Coach Clips", "Set Pieces",
])("does not treat %s as a player", code => {
  expect(looksLikePlayer(code)).toBe(false);
});
it.each(["SAM EXAMPLE", "JO HART-SMITH", "SAM O'DEMO", "SAM START", "LEE PERIOD", "PHYSICAL EXAMPLE"])("retains plain names such as %s", code => {
  expect(looksLikePlayer(code)).toBe(true);
});
it("does not title-case a period code as a player's name", () => {
  expect(displayCode("PERIOD START")).toBe("PERIOD START");
});
