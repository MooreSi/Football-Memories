import { describe, expect, it } from "vitest";
import { wrapLines } from "./titleCard";

const width = (s: string) => s.length * 10; // fake measureText: 10px per character

describe("wrapLines", () => {
  it("keeps short text on one line", () => expect(wrapLines("Best saves", 200, width)).toEqual(["Best saves"]));
  it("breaks at spaces to fit the width", () =>
    expect(wrapLines("My son's football journey so far", 150, width)).toEqual(["My son's", "football", "journey so far"]));
  it("never returns more than the line limit, ending with an ellipsis", () =>
    expect(wrapLines("a b c d e f g h", 10, width, 2)).toEqual(["a", "b…"]));
  it("returns nothing for blank text", () => expect(wrapLines("   ", 100, width)).toEqual([]));
});
